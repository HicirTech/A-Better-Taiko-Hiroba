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
import {
  MEDAL_PLATE_PATH,
  MY_DON_PATH,
  type MedalPlateSource,
  type MyDonSource,
  type NoPictureSource,
  type PictureSources,
  type ScorePanelSource,
  scorePanelPath,
  TITLE_PLATE_PATH,
} from "./picture-sources";
import {
  type AskedPlace,
  checkPng,
  describeAnswer,
  type PngRefusal,
  type PngRules,
  pngDataUrl,
} from "./png-answer";
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
 * A plate my page draws words over: the title plate, 15648 B for a session and 5547 B blank (wiki:
 * Page Map), or the どんメダル plate, about 13 KB. Under a kilobyte is not a plate; over 256 KiB,
 * 1280 pixels wide or 400 high is not one either.
 */
const PLATE_RULES = { minBytes: 1024, maxBytes: 256 * 1024, maxSide: 1280, maxHeight: 400 };
/**
 * The score panel's art, 600×356 as my page's layout implies it, and a full picture, not a plate:
 * under 10 KiB is not the art; over 512 KiB, 1280 pixels wide or 800 high is not it either.
 */
const PANEL_RULES = { minBytes: 10 * 1024, maxBytes: 512 * 1024, maxSide: 1280, maxHeight: 800 };
/**
 * The My Don portrait, 62842 B the one time it was fetched (wiki: Page Map). Under 5 KiB is not a
 * portrait; over 512 KiB or 640 pixels a side is not one either.
 */
const MY_DON_RULES = { minBytes: 5 * 1024, maxBytes: 512 * 1024, maxSide: 640 } as const;
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
   * A read of my page has just found the session good, on `owner`'s page: the bare plates fetched
   * before it, while this session held, are that player's own, and are kept from now on. Called
   * after every read of my page that succeeds, before it answers.
   */
  confirm(owner: string): Promise<void>;
  /**
   * A read of my page is about to go out. A session's first is the one opening the app or a
   * sign-in makes; each after it is the user's own Read again, after which the My Don portrait, the
   * one kept picture that can change under the same address, is fetched anew the next time it is
   * asked for: it may show a costume changed anywhere since.
   */
  myPageAsked(): void;
  /**
   * A costume write applied: the My Don portrait kept shows the costume before it, and is fetched
   * anew the next time it is asked for.
   */
  costumeChanged(): void;
  /**
   * Forgets the run's pictures on their way, and the plates not yet confirmed: they are neither
   * shared with a later call nor kept. Called whenever the session goes.
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
  readonly referer: string;
  /** Where the answer must come from is among them: on Hiroba, or on the picture host. */
  readonly rules: PngRules & { readonly at: AskedPlace };
  readonly key: PictureKey;
  /**
   * Kept only once a later read of my page finds the session good, and shown till then: the bare
   * plate, which Hiroba draws blank for a session it has ended, a PNG no check can tell apart.
   */
  readonly keptAfterRead: boolean;
}

/**
 * Why the platform's state allows no request for a picture, before anything is sent: an item the
 * last editor read did not offer; a picture of my page before the run's first read of it, one the
 * page did not show, or one whose source failed its pattern; the portrait with no picture host.
 */
type Refusal = "notOffered" | "notRead" | "notShown" | "unexpectedSrc" | "noHost";

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
      // A session gone gets a 43-byte GIF, which no check lets through.
      keptAfterRead: false,
    };
  }
  const { owner, sources } = state;
  if (owner === null || sources === null) {
    return "notRead";
  }
  if (want.kind === "scorePanel") {
    return scorePanelRequest(sources.scorePanel, origin);
  }
  if (want.kind === "medalPlate") {
    return medalPlateRequest(sources.medalPlate, owner, origin);
  }
  if (want.kind === "myDon") {
    return myDonRequest(sources.myDon, owner, endpoints);
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
    // As my page loads it.
    referer: `${origin}/mypage_top.php`,
    rules: { ...PLATE_RULES, at: { origin, path: TITLE_PLATE_PATH } },
    // The player's own, kept under them alone, and for good (the user's call, 2026-09-28). The title
    // is in the name, so a title changed anywhere is a plate of its own; the form is too, as the
    // two forms are not yet known to draw the same.
    key: {
      scope: "player",
      player: owner,
      name: `${PICTURE_EPOCH}/titleplate/${plate.form}/${encodeURIComponent(plate.title)}`,
    },
    // The public form is the same with a session or without one.
    keptAfterRead: plate.form === "bare",
  };
}

/** The request for the art of the score panel `panel` names, or why there is none. */
function scorePanelRequest(
  panel: ScorePanelSource | NoPictureSource,
  origin: string,
): PictureRequest | Refusal {
  if (typeof panel === "string") {
    return panel;
  }
  const path = scorePanelPath(panel.level);
  return {
    kind: "scorePanel",
    url: `${origin}${path}`,
    // As my page loads it.
    referer: `${origin}/mypage_top.php`,
    rules: { ...PANEL_RULES, at: { origin, path } },
    // Kept for every account, and for good, by its level: static art that shows no count and
    // names no player, the same with a session or without one.
    key: { scope: "shared", player: null, name: `${PICTURE_EPOCH}/panel/${panel.level}` },
    keptAfterRead: false,
  };
}

/** The request for the どんメダル plate `plate` names, on `owner`'s page, or why there is none. */
function medalPlateRequest(
  plate: MedalPlateSource | NoPictureSource,
  owner: string,
  origin: string,
): PictureRequest | Refusal {
  if (typeof plate === "string") {
    return plate;
  }
  return {
    kind: "medalPlate",
    url: `${origin}${MEDAL_PLATE_PATH}?id=${plate.id}`,
    // As my page loads it.
    referer: `${origin}/mypage_top.php`,
    rules: { ...PLATE_RULES, at: { origin, path: MEDAL_PLATE_PATH } },
    // Kept for good under its player alone, so accounts never share one, by what it shows: the
    // season's id, so a new season is a plate of its own, and where the season stands, as the art
    // may change once the set is complete (unverified). The name is hashed before it is filed.
    key: {
      scope: "player",
      player: owner,
      name: `${PICTURE_EPOCH}/tokenplate/${plate.id}/${plate.progress}`,
    },
    // Keyed by its id, so the same with a session or without one (wiki: Page Map).
    keptAfterRead: false,
  };
}

/**
 * The request for the My Don portrait `portrait` names, on `owner`'s page, from the picture host
 * off Hiroba, or why there is none. Never sent the session: the transports keep it for Hiroba.
 */
function myDonRequest(
  portrait: MyDonSource | NoPictureSource,
  owner: string,
  endpoints: HirobaEndpoints,
): PictureRequest | Refusal {
  const origin = endpoints.imgOrigin;
  if (origin === null) {
    return "noHost";
  }
  if (typeof portrait === "string") {
    return portrait;
  }
  return {
    kind: "myDon",
    url: `${origin}${MY_DON_PATH}?v=${portrait.v}&kind=mydon&fn=mydon_${owner}`,
    // What a browser sends another site from my page: Hiroba's origin alone.
    referer: `${endpoints.hirobaOrigin}/`,
    rules: { ...MY_DON_RULES, at: { origin, path: MY_DON_PATH } },
    // The player's own, under them alone, and one only: the last fetched, which a costume changed
    // since leaves behind, so it is fetched anew then (`costumeChanged`, `myPageAsked`). The name
    // is hashed before it is filed, the player too.
    key: { scope: "player", player: owner, name: `${PICTURE_EPOCH}/mydon` },
    // Keyed by the taiko number, public: the same with a session or without one (wiki: Page Map).
    keptAfterRead: false,
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
 * not the picture is a failure with codes, which is neither kept nor the end of the session. A bare
 * plate is kept only once a later read of my page confirms it, and until then answers repeats
 * within its session.
 *
 * The My Don portrait, from the picture host off Hiroba and never with the session, is the one kept
 * picture that can change under its address: it is kept, one per player, and fetched anew when next
 * asked for after a costume write applies (`costumeChanged`) or the user's Read again
 * (`myPageAsked`). If that fetch fails, the one kept answers until the next of those.
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
  /**
   * The bare plates fetched in this session, by key, that no later read of my page has confirmed
   * yet: shown, and not kept. Hiroba draws a blank one for a session it ended unseen, and only such
   * a read tells that it had not.
   */
  const unconfirmed = new Map<string, { readonly key: PictureKey; readonly bytes: Uint8Array }>();
  const idOf = (key: PictureKey) => `${key.scope}|${key.player ?? ""}|${key.name}`;
  /** Reads of my page asked for in this session: its first is not the user's Read again. */
  let myPageReads = 0;
  /**
   * How many times this run the portrait may have changed, and as of which of them the one kept was
   * fetched: kept as of an earlier one, it is fetched anew when next asked for. A change is one
   * whoever signs in next, so neither goes with the session.
   */
  let myDonChanges = 0;
  let myDonKeptAsOf = 0;
  /** Whether `request` is the portrait, kept from before a change and not fetched since. */
  const isStale = (request: PictureRequest) =>
    request.kind === "myDon" && myDonKeptAsOf < myDonChanges;

  const failed = (
    kind: string,
    why: string,
    response?: TransportResponse,
    request?: PictureRequest,
    refusal?: PngRefusal,
  ): Result<never, PictureFailure> => {
    const parts = [`${kind}=${why}`];
    if (response !== undefined && request !== undefined) {
      parts.push(describeAnswer(response, request.rules.at));
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

  /** The picture `request` names as this run has it: kept, or fetched in this session. */
  const kept = async (request: PictureRequest): Promise<PictureView | null> => {
    const shown = unconfirmed.get(idOf(request.key));
    if (shown !== undefined) {
      return viewOf(shown.bytes, request);
    }
    try {
      const bytes = await store.get(request.key);
      return bytes === null ? null : viewOf(bytes, request);
    } catch {
      return null;
    }
  };

  /**
   * `failure`, or, for a stale portrait, the one kept from before, which stays stale: where the
   * network is poor, as at an arcade, the last costume shown is better than none.
   */
  const orKept = async (
    stale: boolean,
    request: PictureRequest,
    failure: Result<never, PictureFailure>,
  ): Promise<Result<PictureView, PictureFailure>> => {
    const before = stale ? await kept(request) : null;
    return before === null ? failure : ok(before);
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
      // That title's plate may be kept already: then the store answers, and nothing is sent. A stale
      // portrait is fetched anew.
      const stale = isStale(request);
      const view = stale ? null : await kept(request);
      if (view !== null) {
        fetched -= 1;
        return ok(view);
      }
      const asOf = myDonChanges;
      /**
       * `failure`, as `orKept` answers it. A renewal that fails is spent all the same: the portrait
       * is fetched anew only after the next change (the user's call, 2026-09-28).
       */
      const notCome = (failure: Result<never, PictureFailure>) => {
        if (stale && since === generation) {
          myDonKeptAsOf = Math.max(myDonKeptAsOf, asOf);
        }
        return orKept(stale, request, failure);
      };
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
        return notCome(failed(request.kind, gaveUp ? "timedOut" : sent.error.kind));
      }
      const checked = checkPng(sent.value, request.rules);
      if (isErr(checked) || checked.value.size === null) {
        const refusal: PngRefusal = isErr(checked) ? checked.error : { why: "notPngBytes" };
        return notCome(failed(request.kind, refusal.why, sent.value, request, refusal));
      }
      if (since === generation && request.keptAfterRead) {
        unconfirmed.set(idOf(request.key), { key: request.key, bytes: checked.value.bytes });
      } else if (since === generation) {
        try {
          await store.put(request.key, checked.value.bytes);
          if (request.kind === "myDon") {
            myDonKeptAsOf = Math.max(myDonKeptAsOf, asOf);
          }
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
      const stale = isStale(request);
      const view = stale ? null : await kept(request);
      if (view !== null) {
        return ok(view);
      }
      const id = idOf(request.key);
      const onItsWay = inFlight.get(id);
      if (onItsWay !== undefined) {
        return onItsWay;
      }
      if (fetched >= limits.budget) {
        return orKept(stale, request, failed(want.kind, "budgetSpent"));
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
    async confirm(owner) {
      for (const [id, { key, bytes }] of unconfirmed) {
        if (key.player === owner) {
          try {
            await store.put(key, bytes);
          } catch {
            // Only the store's copy is lost: the plate is fetched again the next time.
          }
        }
        unconfirmed.delete(id);
      }
    },
    myPageAsked() {
      myPageReads += 1;
      if (myPageReads > 1) {
        myDonChanges += 1;
      }
    },
    costumeChanged() {
      myDonChanges += 1;
    },
    forget() {
      generation += 1;
      myPageReads = 0;
      inFlight.clear();
      unconfirmed.clear();
    },
  };
}
