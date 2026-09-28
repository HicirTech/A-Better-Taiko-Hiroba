import {
  type CostumeEditorView,
  err,
  isErr,
  ok,
  type Result,
  type Transport,
  type TransportResponse,
} from "@abth/core";

import {
  type CostumeSlot,
  isPictureWant,
  type PictureFailure,
  type PictureView,
  type PictureWant,
} from "../session-port";
import type { HirobaQueue } from "./hiroba-queue";
import { type PictureSources, TITLE_PLATE_PATH } from "./picture-sources";
import { checkPng, describeAnswer, type PngRefusal, type PngRules, pngDataUrl } from "./png-answer";
import { PICTURE_EPOCH, type PictureKey, type PictureStore } from "./picture-store";
import type { HirobaEndpoints } from "./types";

/** An item's thumbnail, by its id and slot, in the order the editor page's `srctmp` writes them. */
const ITEM_PATH = "/imgsrc_kisekae.php";
/** What a browser's `<img>` sends: Hiroba's own pages load these pictures that way. */
const IMAGE_ACCEPT = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";
/**
 * A thumbnail is a small PNG, about a kilobyte (258 of them on one account); Hiroba's "nothing to
 * draw" is a 43-byte GIF. Under 128 bytes is a placeholder; over 64 KiB or 512 pixels a side is not
 * a thumbnail.
 */
const ITEM_RULES = { minBytes: 128, maxBytes: 64 * 1024, maxSide: 512 } as const;
/**
 * The plate my page draws the title on: 15648 B for a session, 5547 B blank (wiki: Page Map). Under
 * a kilobyte is not a plate; over 256 KiB, 1280 pixels wide or 400 high is not one either.
 */
const TITLE_PLATE_RULES = { minBytes: 1024, maxBytes: 256 * 1024, maxSide: 1280, maxHeight: 400 };
/** The slot each costume value of a set is in, きぐるみ first. */
const WORN = ["costume1", "costume2", "costume3", "costume4", "costume5"] as const;

/**
 * How hard the pictures may lean on Hiroba, as configuration (wiki: Fetch-Safety). One picture at
 * a time already comes from the queue.
 */
export interface PictureLimits {
  /** Up to this many milliseconds, at random, waited before each fetch, outside the queue. */
  readonly jitterMs: number;
  /** At least this long between the end of one picture fetch and the start of the next. */
  readonly minGapMs: number;
  /**
   * How long one fetch may take before it is given up, or null to leave it to the transport: on
   * Android, where a native call cannot be stopped, giving up earlier would let the next request
   * go out beside it.
   */
  readonly timeoutMs: number | null;
  /** The most pictures fetched from Hiroba in one run; those after it are refused unsent. */
  readonly budget: number;
}

export const DESKTOP_PICTURE_LIMITS: PictureLimits = {
  jitterMs: 100,
  minGapMs: 0,
  timeoutMs: 8000,
  budget: 300,
};

export const ANDROID_PICTURE_LIMITS: PictureLimits = { ...DESKTOP_PICTURE_LIMITS, timeoutMs: null };

/** The clock the pauses are waited on: the page's own, or a test's. */
export interface PictureClock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

const REAL_CLOCK: PictureClock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** What the platform knows now that decides whether a picture may be asked for at all. */
export interface PictureReadState {
  readonly signedIn: boolean;
  /** The items the last costume editor read offered, as `offerKey` writes them. */
  readonly offered: ReadonlySet<string>;
  /** Whose my page this run last read: the taiko number. Null before the first read. */
  readonly owner: string | null;
  /** Where the pictures that page showed are, checked. Null before the first read. */
  readonly sources: PictureSources | null;
}

export interface PictureReaderOptions {
  /** The platform's transport: it adds the session, and only for Hiroba's own origin. */
  readonly transport: Transport;
  readonly endpoints: HirobaEndpoints;
  readonly store: PictureStore;
  /** The queue every request to Hiroba goes through; only the fetch itself waits in it. */
  readonly queue: Pick<HirobaQueue, "oneAtATime">;
  readonly limits: PictureLimits;
  /** Read at each call, and again when a fetch's turn comes. */
  readonly state: () => PictureReadState;
  readonly clock?: PictureClock;
  /** A number from 0 up to 1, for the pause before a fetch. */
  readonly random?: () => number;
}

export interface PictureReader {
  /**
   * The picture `want` names, checked again here: Android has no process boundary in front of it.
   * From the store when it holds it, or one GET, shared by every call for the same picture while it
   * is on its way.
   */
  read(want: unknown): Promise<Result<PictureView, PictureFailure>>;
  /**
   * Forgets the run's pictures on their way: they are neither shared with a later call nor kept.
   * Called whenever the session goes.
   */
  forget(): void;
}

/** How the offered items are named: slot, then id. */
export const offerKey = (slot: CostumeSlot, id: number) => `${slot}:${id}`;

/**
 * The items a costume editor read offers, the only ones whose thumbnail may be asked for: each
 * slot's owned items, and the item worn in it, which the owned list may lack. So a thumbnail can
 * never be used to walk the ids or to ask what the account owns.
 */
export function offeredOf(editor: CostumeEditorView): ReadonlySet<string> {
  const offered = new Set<string>();
  WORN.forEach((part, index) => {
    const slot = (index + 1) as CostumeSlot;
    for (const id of editor.slots[index] ?? []) {
      offered.add(offerKey(slot, id));
    }
    if (editor.state[part] !== 0) {
      offered.add(offerKey(slot, editor.state[part]));
    }
  });
  return offered;
}

/** One picture's request, built here from a checked want: never from anything the window sent. */
interface PictureRequest {
  readonly kind: PictureWant["kind"];
  readonly url: string;
  readonly path: string;
  readonly referer: string;
  readonly rules: PngRules;
  readonly key: PictureKey;
}

/**
 * Why the platform's state allows no request for a picture, before anything is sent: an item the
 * last editor read did not offer; a picture of my page before the run's first read of it, one the
 * page did not show, or one whose source failed its pattern.
 */
type Refusal = "notOffered" | "notRead" | "notShown" | "unexpectedSrc";

/**
 * The request for `want`, built from a fixed path and what `state` holds, or why there is none.
 * Nothing the window sent reaches an address but checked numbers.
 */
function requestOf(
  want: PictureWant,
  endpoints: HirobaEndpoints,
  state: PictureReadState,
): PictureRequest | Refusal {
  const origin = endpoints.hirobaOrigin;
  if (want.kind === "costumeItem") {
    if (!state.offered.has(offerKey(want.slot, want.id))) {
      return "notOffered";
    }
    return {
      kind: want.kind,
      url: `${origin}${ITEM_PATH}?cos=${want.id}&type=${want.slot}`,
      path: ITEM_PATH,
      // As Hiroba's own editor loads them, and as the preview is asked for.
      referer: `${origin}/mypage_kisekae.php`,
      rules: { ...ITEM_RULES, at: { origin, path: ITEM_PATH } },
      // Kept for every account, and for good: it names no player and shows only the item. The slot
      // is part of the key, as one id sits in several slots.
      key: {
        scope: "shared",
        player: null,
        name: `${PICTURE_EPOCH}/item/${want.slot}/${want.id}`,
      },
    };
  }
  const { owner, sources } = state;
  if (owner === null || sources === null) {
    return "notRead";
  }
  const plate = sources.titlePlate;
  if (typeof plate === "string") {
    return plate;
  }
  // The form my page wrote: bare, the plate of whoever holds the session, or its own taiko number.
  const query = plate.form === "bare" ? "" : `?taiko_no=${owner}`;
  return {
    kind: want.kind,
    url: `${origin}${TITLE_PLATE_PATH}${query}`,
    path: TITLE_PLATE_PATH,
    // As my page loads it.
    referer: `${origin}/mypage_top.php`,
    rules: { ...TITLE_PLATE_RULES, at: { origin, path: TITLE_PLATE_PATH } },
    // The player's own, kept under them alone, and for good (the user's call, 2026-09-28). The title
    // is in the name, so a title changed anywhere is a plate of its own; the form is too, as the
    // two forms are not yet known to draw the same.
    key: {
      scope: "player",
      player: owner,
      name: `${PICTURE_EPOCH}/titleplate/${plate.form}/${encodeURIComponent(plate.title)}`,
    },
  };
}

/**
 * The pictures of Hiroba the window may show, fetched by the platform with the session and handed
 * over as bytes, for both shells. The window names what it wants; the address is built here from a
 * fixed path and checked numbers, or what the platform read off my page, and only for what its
 * state allows: nothing while signed out, nothing the last editor read did not offer, nothing of my
 * page it has not read or that did not show, and nothing past the run's budget.
 *
 * A picture kept in the store is answered at once, without the queue. Otherwise one GET goes out,
 * after a short random pause waited outside the queue, then in the queue with every other request
 * to Hiroba, so it never lands between a write's requests. It is never retried; an answer that is
 * not the picture is a failure with codes, which is neither kept nor the end of the session.
 */
export function createPictureReader(options: PictureReaderOptions): PictureReader {
  const { transport, endpoints, store, queue, limits } = options;
  const clock = options.clock ?? REAL_CLOCK;
  const random = options.random ?? Math.random;
  const inFlight = new Map<string, Promise<Result<PictureView, PictureFailure>>>();
  /** Network fetches this run, against the budget. */
  let fetched = 0;
  /** Bumped by forget(): a fetch from before it keeps nothing. */
  let generation = 0;
  let lastFetchEnded = Number.NEGATIVE_INFINITY;

  const failed = (
    kind: string,
    why: string,
    response?: TransportResponse,
    request?: PictureRequest,
    refusal?: PngRefusal,
  ): Result<never, PictureFailure> => {
    const parts = [`${kind}=${why}`];
    if (response !== undefined && request !== undefined) {
      parts.push(describeAnswer(response, { path: request.path, origin: endpoints.hirobaOrigin }));
    }
    if (refusal?.why === "badSize") {
      parts.push(`size=${refusal.width}x${refusal.height}`);
    }
    return err({ code: parts.join(" ") });
  };

  /** The PictureView of `bytes` under `request`'s rules, or null when they do not pass. */
  const viewOf = (bytes: Uint8Array, request: PictureRequest): PictureView | null => {
    const checked = checkPng(
      { status: 200, url: request.url, headers: { "content-type": "image/png" }, body: bytes },
      request.rules,
    );
    if (isErr(checked) || checked.value.size === null) {
      return null;
    }
    return { src: pngDataUrl(checked.value.bytes), ...checked.value.size };
  };

  const kept = async (request: PictureRequest): Promise<PictureView | null> => {
    try {
      const bytes = await store.get(request.key);
      return bytes === null ? null : viewOf(bytes, request);
    } catch {
      return null;
    }
  };

  const fetchPicture = async (
    want: PictureWant,
    since: number,
  ): Promise<Result<PictureView, PictureFailure>> => {
    const gap = Math.max(0, lastFetchEnded + limits.minGapMs - clock.now());
    await clock.sleep(gap + random() * limits.jitterMs);
    return queue.oneAtATime(async (): Promise<Result<PictureView, PictureFailure>> => {
      // The session may have gone while this waited its turn: then nothing is sent.
      const state = options.state();
      if (!state.signedIn || since !== generation) {
        fetched -= 1;
        return failed(want.kind, "notSignedIn");
      }
      // Built again from the state now: a read of my page that landed while this waited may have
      // changed the title, and Hiroba draws the plate as it is now, which must be kept as such.
      const request = requestOf(want, endpoints, state);
      if (typeof request === "string") {
        fetched -= 1;
        return failed(want.kind, request);
      }
      // That title's plate may be kept already: then the store answers, and nothing is sent.
      const view = await kept(request);
      if (view !== null) {
        fetched -= 1;
        return ok(view);
      }
      const signal = limits.timeoutMs === null ? undefined : AbortSignal.timeout(limits.timeoutMs);
      const sent = await transport.send(
        {
          method: "GET",
          url: request.url,
          headers: { Referer: request.referer, Accept: IMAGE_ACCEPT },
        },
        signal,
      );
      lastFetchEnded = clock.now();
      if (isErr(sent)) {
        const gaveUp = sent.error.kind === "cancelled" && signal?.aborted === true;
        return failed(request.kind, gaveUp ? "timedOut" : sent.error.kind);
      }
      const checked = checkPng(sent.value, request.rules);
      if (isErr(checked) || checked.value.size === null) {
        const refusal: PngRefusal = isErr(checked) ? checked.error : { why: "notPngBytes" };
        return failed(request.kind, refusal.why, sent.value, request, refusal);
      }
      if (since === generation) {
        try {
          await store.put(request.key, checked.value.bytes);
        } catch {
          // Only the store's copy is lost: the picture is fetched again the next time.
        }
      }
      return ok({ src: pngDataUrl(checked.value.bytes), ...checked.value.size });
    })();
  };

  return {
    async read(want) {
      if (!isPictureWant(want)) {
        return err({ code: "picture=refused" });
      }
      const state = options.state();
      if (!state.signedIn) {
        return failed(want.kind, "notSignedIn");
      }
      const request = requestOf(want, endpoints, state);
      if (typeof request === "string") {
        return failed(want.kind, request);
      }
      const view = await kept(request);
      if (view !== null) {
        return ok(view);
      }
      const id = `${request.key.scope}|${request.key.player ?? ""}|${request.key.name}`;
      const onItsWay = inFlight.get(id);
      if (onItsWay !== undefined) {
        return onItsWay;
      }
      if (fetched >= limits.budget) {
        return failed(want.kind, "budgetSpent");
      }
      fetched += 1;
      const fetching = fetchPicture(want, generation).finally(() => {
        if (inFlight.get(id) === fetching) {
          inFlight.delete(id);
        }
      });
      inFlight.set(id, fetching);
      return fetching;
    },
    forget() {
      generation += 1;
      inFlight.clear();
    },
  };
}
