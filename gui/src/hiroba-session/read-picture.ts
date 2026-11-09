import { err, isErr, ok, type Result, type TransportResponse } from "@abth/core";

import type { PictureStore } from "../shared/picture-store";
import { type GroupAsked, type Pipeline, resultFailure } from "../shared/pipelines";
import { checkPng, describeAnswer, type PngRefusal, pngDataUrl } from "../shared/png-answer";
import {
  isPictureWant,
  type PictureFailure,
  type PictureView,
  type PictureWant,
} from "../shared/session-port";
import { createPictureCache, pictureId } from "./picture-cache";
import { type PictureReadState, type PictureRequest, requestOf } from "./picture-requests";
import type { HirobaEndpoints } from "./types";

/** What a browser's `<img>` sends: Hiroba's own pages load these pictures that way. */
const IMAGE_ACCEPT = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";
export interface PictureLimits {
  /** Up to this many milliseconds, at random, waited before each fetch, outside the pipeline. */
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

export const CAPACITOR_PICTURE_LIMITS: PictureLimits = {
  ...DESKTOP_PICTURE_LIMITS,
  timeoutMs: null,
};

export interface PictureClock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

const REAL_CLOCK: PictureClock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export interface PictureReaderOptions {
  readonly endpoints: HirobaEndpoints;
  readonly store: PictureStore;
  /** Hiroba's IO pipeline: each fetch is a read group, so no picture lands inside a write; the
   * group's transport adds the session, and only for Hiroba's own origin. */
  readonly pipeline: Pick<Pipeline, "read">;
  readonly limits: PictureLimits;
  /** Read at each call, and again when a fetch's turn comes. */
  readonly state: () => PictureReadState;
  readonly clock?: PictureClock;
  readonly random?: () => number;
}

export interface PictureReader {
  /** Checks `want` again (Android has no process boundary); from the store, or one shared GET. */
  read(want: unknown, again?: boolean): Promise<Result<PictureView, PictureFailure>>;
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

/** The operation a picture's fetch runs as in Hiroba's pipeline. */
export const PICTURE_OPERATION = "picture";
const PICTURE: GroupAsked<Result<PictureView, PictureFailure>> = {
  operation: PICTURE_OPERATION,
  failureOf: resultFailure,
};

/** Hiroba's pictures for the window: it names what it wants, and the address is built here. */
export function createPictureReader(options: PictureReaderOptions): PictureReader {
  const { endpoints, store, pipeline, limits } = options;
  const clock = options.clock ?? REAL_CLOCK;
  const random = options.random ?? Math.random;
  const inFlight = new Map<string, Promise<Result<PictureView, PictureFailure>>>();
  let budgetUsed = 0;
  /** Bumped by forget(): a fetch from before it keeps nothing. */
  let generation = 0;
  let lastFetchEnded = Number.NEGATIVE_INFINITY;
  const cache = createPictureCache(store);
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

  // A stale portrait falls back to the kept one: on a poor network, as at an arcade, the last
  // costume shown beats none.
  const orKept = async (
    stale: boolean,
    request: PictureRequest,
    failure: Result<never, PictureFailure>,
  ): Promise<Result<PictureView, PictureFailure>> => {
    const before = stale ? await cache.kept(request) : null;
    return before === null ? failure : ok(before);
  };

  // Read again, a picture that does not come is a failure still, the one kept shown in its place.
  const keptBeside = async (
    request: PictureRequest,
    failure: Result<never, PictureFailure>,
  ): Promise<Result<PictureView, PictureFailure>> => {
    const before = await cache.kept(request);
    return before === null || failure.ok ? failure : err({ ...failure.error, kept: before });
  };

  const fetchPicture = async (
    want: PictureWant,
    since: number,
    again: boolean,
  ): Promise<Result<PictureView, PictureFailure>> => {
    const gap = Math.max(0, lastFetchEnded + limits.minGapMs - clock.now());
    await clock.sleep(gap + random() * limits.jitterMs);
    return pipeline.read({ ...PICTURE, subject: want.kind }, async (transport) => {
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
      const view = stale || again ? null : await cache.kept(request);
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
        return again ? keptBeside(request, failure) : orKept(stale, request, failure);
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
        cache.hold(request.key, checked.value.bytes);
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
    });
  };

  return {
    async read(want, again = false) {
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
      const view = stale || again ? null : await cache.kept(request);
      if (view !== null) {
        return ok(view);
      }
      // A fetch on its way may still answer from the store: one read again shares only its own.
      const id = `${again ? "again|" : ""}${pictureId(request.key)}`;
      const onItsWay = inFlight.get(id);
      if (onItsWay !== undefined) {
        return onItsWay;
      }
      if (budgetUsed >= limits.budget) {
        const spent = failed(want.kind, "budgetSpent");
        return again ? keptBeside(request, spent) : orKept(stale, request, spent);
      }
      budgetUsed += 1;
      const fetching = fetchPicture(want, generation, again).finally(() => {
        if (inFlight.get(id) === fetching) {
          inFlight.delete(id);
        }
      });
      inFlight.set(id, fetching);
      return fetching;
    },
    confirm(owner) {
      return cache.confirm(owner);
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
      cache.forget();
    },
  };
}
