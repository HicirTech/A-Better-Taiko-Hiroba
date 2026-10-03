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

const ITEM_PATH = "/imgsrc_kisekae.php";
/** What a browser's `<img>` sends: Hiroba's own pages load these pictures that way. */
const IMAGE_ACCEPT = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";
// Size bounds that tell the picture from a placeholder (a 43-byte GIF is Hiroba's "nothing to
// draw") and from anything else.
const ITEM_RULES = { minBytes: 128, maxBytes: 64 * 1024, maxSide: 512 } as const;
const PLATE_RULES = { minBytes: 1024, maxBytes: 256 * 1024, maxSide: 1280, maxHeight: 400 };
const PANEL_RULES = { minBytes: 10 * 1024, maxBytes: 512 * 1024, maxSide: 1280, maxHeight: 800 };
const MY_DON_RULES = { minBytes: 5 * 1024, maxBytes: 512 * 1024, maxSide: 640 } as const;
const SLOT_FIELDS = ["costume1", "costume2", "costume3", "costume4", "costume5"] as const;

export interface PictureLimits {
  /** Up to this many milliseconds, at random, waited before each fetch, outside the queue. */
  readonly jitterMs: number;
  /** At least this long between the end of one picture fetch and the start of the next. */
  readonly minGapMs: number;
  /** Null leaves it to the transport: on Android a native call cannot be stopped, so giving up
   * earlier would let the next request go out beside it. */
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
  /** Every request to Hiroba goes through it, so no picture lands between a write's requests. */
  readonly queue: Pick<HirobaQueue, "oneAtATime">;
  readonly limits: PictureLimits;
  /** Read at each call, and again when a fetch's turn comes. */
  readonly state: () => PictureReadState;
  readonly clock?: PictureClock;
  readonly random?: () => number;
}

export interface PictureReader {
  /** Checks `want` again (Android has no process boundary); from the store, or one shared GET. */
  read(want: unknown): Promise<Result<PictureView, PictureFailure>>;
  /** After a good read of my page: keeps the bare plates fetched this session as `owner`'s. */
  confirm(owner: string): Promise<void>;
  /** A read of my page is going out. After the session's first, the My Don portrait is fetched
   * anew: it may show a costume changed anywhere since. */
  myPageAsked(): void;
  /** A costume write applied: the My Don portrait kept is fetched anew when next asked for. */
  costumeChanged(): void;
  /** Drops pictures on their way and unconfirmed plates; called whenever the session goes. */
  forget(): void;
}

export const offerKey = (slot: CostumeSlot, id: number) => `${slot}:${id}`;

/** Each slot's owned items plus the worn one, which the owned list may lack: the only thumbnails
 * that may be asked for, so ids cannot be walked. */
export function offeredOf(editor: CostumeEditorView): ReadonlySet<string> {
  const offered = new Set<string>();
  SLOT_FIELDS.forEach((part, index) => {
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
  /** The checks the answer passes, among them where it must come from. */
  readonly rules: PngRules & { readonly at: AskedPlace };
  readonly key: PictureKey;
  /** Kept only once a later read of my page finds the session good: for a session it has ended,
   * Hiroba draws the bare plate blank, a PNG no check can tell apart. */
  readonly keptAfterRead: boolean;
}

type Refusal = "notOffered" | "notRead" | "notShown" | "unexpectedSrc" | "noHost";

/** The request for `want` from a fixed path and `state`, or why there is none. */
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
      referer: `${origin}/mypage_kisekae.php`,
      rules: { ...ITEM_RULES, at: { origin, path: ITEM_PATH } },
      // Shared by every account and kept for good: it names no player. The slot is in the key, as
      // one id sits in several slots.
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
  // Bare is the plate of whoever holds the session; the other form names the taiko number.
  const query = plate.form === "bare" ? "" : `?taiko_no=${owner}`;
  return {
    kind: want.kind,
    url: `${origin}${TITLE_PLATE_PATH}${query}`,
    referer: `${origin}/mypage_top.php`,
    rules: { ...PLATE_RULES, at: { origin, path: TITLE_PLATE_PATH } },
    // Per player. The title and the form are in the name: a changed title is a plate of its own,
    // and the two forms are not known to draw the same.
    key: {
      scope: "player",
      player: owner,
      name: `${PICTURE_EPOCH}/titleplate/${plate.form}/${encodeURIComponent(plate.title)}`,
    },
    // Only the bare form depends on the session; the public one is the same without it.
    keptAfterRead: plate.form === "bare",
  };
}

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
    referer: `${origin}/mypage_top.php`,
    rules: { ...PANEL_RULES, at: { origin, path } },
    // Shared and kept for good: static art that names no player, the same without a session.
    key: { scope: "shared", player: null, name: `${PICTURE_EPOCH}/panel/${panel.level}` },
    keptAfterRead: false,
  };
}

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
    referer: `${origin}/mypage_top.php`,
    rules: { ...PLATE_RULES, at: { origin, path: MEDAL_PLATE_PATH } },
    // Per player. The season's id and progress are in the name: a new season is a plate of its
    // own, and the art may change once the set is complete (unverified).
    key: {
      scope: "player",
      player: owner,
      name: `${PICTURE_EPOCH}/tokenplate/${plate.id}/${plate.progress}`,
    },
    keptAfterRead: false,
  };
}

// Asked of the picture host, never with the session: the transports keep that for Hiroba.
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
    // Per player, and only the last one fetched: a changed costume leaves it behind, so it is
    // fetched anew then.
    key: { scope: "player", player: owner, name: `${PICTURE_EPOCH}/mydon` },
    keptAfterRead: false,
  };
}

/** Hiroba's pictures for the window: it names what it wants, and the address is built here. */
export function createPictureReader(options: PictureReaderOptions): PictureReader {
  const { transport, endpoints, store, queue, limits } = options;
  const clock = options.clock ?? REAL_CLOCK;
  const random = options.random ?? Math.random;
  const inFlight = new Map<string, Promise<Result<PictureView, PictureFailure>>>();
  let budgetUsed = 0;
  /** Bumped by forget(): a fetch from before it keeps nothing. */
  let generation = 0;
  let lastFetchEnded = Number.NEGATIVE_INFINITY;
  const unconfirmed = new Map<string, { readonly key: PictureKey; readonly bytes: Uint8Array }>();
  const idOf = (key: PictureKey) => `${key.scope}|${key.player ?? ""}|${key.name}`;
  let myPageReads = 0;
  // How often the portrait may have changed this run, and as of which change the kept one was
  // fetched. They outlive the session: a change concerns whoever signs in next.
  let myDonChanges = 0;
  let myDonKeptAsOf = 0;
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

  // A stale portrait falls back to the kept one: on a poor network, as at an arcade, the last
  // costume shown beats none.
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
        budgetUsed -= 1;
        return failed(want.kind, "notSignedIn");
      }
      // Built again from the state now: a read of my page that landed while this waited may have
      // changed the title, and Hiroba draws the plate as it is now.
      const request = requestOf(want, endpoints, state);
      if (typeof request === "string") {
        budgetUsed -= 1;
        return failed(want.kind, request);
      }
      const stale = isStale(request);
      const view = stale ? null : await kept(request);
      if (view !== null) {
        budgetUsed -= 1;
        return ok(view);
      }
      const asOf = myDonChanges;
      // A failed renewal still counts: the portrait is fetched anew only after the next change.
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
      if (budgetUsed >= limits.budget) {
        return orKept(stale, request, failed(want.kind, "budgetSpent"));
      }
      budgetUsed += 1;
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
