import type { Result } from "@abth/core";

import type { CostumePreviewFailure, CostumeSet } from "../session-port";
import { COSTUME_PARTS } from "./costume-parts";

export interface PreviewState {
  /** The last picture that came, as a data: URL. */
  readonly image: string | null;
  /** The wanted set's picture is on its way, or waiting out the pause after a pick. */
  readonly loading: boolean;
  /** Why the wanted set's picture did not come, as codes. */
  readonly failure: string | null;
}

export const NO_PREVIEW: PreviewState = { image: null, loading: false, failure: null };

export const PREVIEW_DELAY_MS = 300;
const MAX_KEPT_PICTURES = 8;

export interface PreviewTimers {
  set(run: () => void, ms: number): unknown;
  clear(timer: unknown): void;
}

export interface PreviewSchedulerOptions {
  readonly load: (set: CostumeSet) => Promise<Result<string, CostumePreviewFailure>>;
  /** Called on every change while started, and on reset. */
  readonly onState: (state: PreviewState) => void;
  readonly delayMs?: number;
  readonly timers?: PreviewTimers;
}

export interface PreviewScheduler {
  /** Resumes: shows what it has, and asks for the wanted set if it is still to be drawn. */
  start(): void;
  /** Asks nothing more; a picture landing meanwhile is kept, and shown on `start`. */
  stop(): void;
  /** The set the editor shows now: the first is asked for at once, each later one after a pause. */
  want(set: CostumeSet): void;
  /** Takes a picture already in hand for `set`: a `want` of it shows it and asks nothing. */
  keep(set: CostumeSet, image: string): void;
  /** Forgets everything when a session ends, so the next player never sees this one's picture. */
  reset(): void;
}

const PAGE_TIMERS: PreviewTimers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
};

export const keyOf = (set: CostumeSet) => COSTUME_PARTS.map((part) => set[part]).join(",");

/** Asks Hiroba for the set's picture sparingly: one in flight, after a pause, never a retry. */
export function createPreviewScheduler(options: PreviewSchedulerOptions): PreviewScheduler {
  const delayMs = options.delayMs ?? PREVIEW_DELAY_MS;
  const timers = options.timers ?? PAGE_TIMERS;
  const kept = new Map<string, string>();
  let state = NO_PREVIEW;
  let started = false;
  // Whatever came of it: only a new pick asks for a set again.
  let askedKey: string | null = null;
  let wanted: { readonly key: string; readonly set: CostumeSet } | null = null;
  let shownKey: string | null = null;
  let inFlight: string | null = null;
  let timer: unknown = null;
  let generation = 0;

  const show = (next: PreviewState) => {
    state = next;
    if (started) {
      options.onState(next);
    }
  };
  const clearTimer = () => {
    if (timer !== null) {
      timers.clear(timer);
      timer = null;
    }
  };
  const showKept = (key: string): boolean => {
    const image = key === shownKey ? state.image : kept.get(key);
    if (image === undefined || image === null) {
      return false;
    }
    shownKey = key;
    show({ image, loading: false, failure: null });
    return true;
  };

  const send = () => {
    timer = null;
    if (!started || wanted === null || inFlight !== null) {
      return;
    }
    const { key, set } = wanted;
    if (showKept(key)) {
      return;
    }
    inFlight = key;
    askedKey = key;
    const asked = generation;
    show({ ...state, loading: true, failure: null });
    options
      .load(set)
      .then(
        (answer) => (answer.ok ? { image: answer.value } : { failure: answer.error.code }),
        // The call itself failed, as a bridge that refused it does.
        () => ({ failure: "preview=callFailed" }),
      )
      .then((answer) => {
        if (asked !== generation) {
          return;
        }
        inFlight = null;
        if (wanted?.key !== key) {
          // Superseded: drop it; the newest set is asked for now, or when a running pause ends.
          if (timer === null) {
            send();
          }
          return;
        }
        // Stopped, the answer is still kept and noted, and shown when it starts again.
        if ("image" in answer) {
          remember(key, answer.image);
          shownKey = key;
          show({ image: answer.image, loading: false, failure: null });
        } else {
          show({ ...state, loading: false, failure: answer.failure });
        }
      });
  };

  const remember = (key: string, image: string) => {
    kept.delete(key);
    kept.set(key, image);
    for (const oldest of kept.keys()) {
      if (kept.size <= MAX_KEPT_PICTURES) {
        break;
      }
      kept.delete(oldest);
    }
  };

  const plan = () => {
    if (!started || wanted === null) {
      return;
    }
    const { key } = wanted;
    clearTimer();
    if (showKept(key)) {
      return;
    }
    if (inFlight === key) {
      show({ ...state, loading: true, failure: null });
      return;
    }
    if (askedKey === null) {
      send();
      return;
    }
    show({ ...state, loading: true, failure: null });
    timer = timers.set(send, delayMs);
  };

  return {
    start() {
      started = true;
      options.onState(state);
      // Only a set not asked for yet: stopping and starting again is not a retry.
      if (wanted !== null && wanted.key !== askedKey) {
        plan();
      }
    },
    stop() {
      started = false;
      clearTimer();
    },
    want(set) {
      const key = keyOf(set);
      if (wanted?.key === key) {
        return;
      }
      wanted = { key, set };
      plan();
    },
    keep(set, image) {
      const key = keyOf(set);
      remember(key, image);
      if (wanted?.key === key) {
        plan();
      }
    },
    reset() {
      generation += 1;
      clearTimer();
      kept.clear();
      wanted = null;
      askedKey = null;
      shownKey = null;
      inFlight = null;
      state = NO_PREVIEW;
      options.onState(NO_PREVIEW);
    },
  };
}
