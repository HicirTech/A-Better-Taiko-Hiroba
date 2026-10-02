import type { Result } from "@abth/core";

import type { CostumePreviewFailure, CostumeSet } from "../session-port";
import { COSTUME_PARTS } from "./costume-parts";

/** What the editor's preview shows. */
export interface PreviewState {
  /** The last picture that came, as a data: URL; null until one has. */
  readonly image: string | null;
  /** The picture of the set wanted now is on its way, or waiting out the pause after a pick. */
  readonly loading: boolean;
  /** Why the picture of the set wanted now did not come, as codes; null while none has failed. */
  readonly failure: string | null;
}

export const NO_PREVIEW: PreviewState = { image: null, loading: false, failure: null };

/** How long a pick waits before its picture is asked for; a pick inside it starts it over. */
export const PREVIEW_DELAY_MS = 300;
/** Pictures kept for sets already drawn this opening, so a pick back to one asks nothing. */
const KEPT_PICTURES = 8;

/** A timer that can be cleared: the page's own, or a test's. */
export interface PreviewTimers {
  set(run: () => void, ms: number): unknown;
  clear(timer: unknown): void;
}

export interface PreviewSchedulerOptions {
  /** One request for one set's picture: the port's previewCostume. */
  readonly load: (set: CostumeSet) => Promise<Result<string, CostumePreviewFailure>>;
  /** Called with every change to what the preview shows, while started. */
  readonly onState: (state: PreviewState) => void;
  readonly delayMs?: number;
  readonly timers?: PreviewTimers;
}

export interface PreviewScheduler {
  /**
   * Lets it ask again, shows what it has, and asks for the set wanted if that is still to be drawn.
   * A picture that landed while it was stopped is shown now.
   */
  start(): void;
  /**
   * Asks nothing more: the pause after a pick is dropped, and a picture landing is kept but not
   * shown until it starts again.
   */
  stop(): void;
  /** The set the editor shows now. The first is asked for at once; each after it after a pause. */
  want(set: CostumeSet): void;
}

const PAGE_TIMERS: PreviewTimers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
};

/** One key per set: the eight values in the editor's order. */
const keyOf = (set: CostumeSet) => COSTUME_PARTS.map((part) => set[part]).join(",");

/**
 * How often the editor asks Hiroba for a picture of the set, kept down as Hiroba's own editor does
 * not: one picture when the editor first shows, then one per change once the picks pause, so a
 * burst of clicks is one request. At most one request is in flight. A set picked while one is on
 * its way supersedes it: that picture is dropped when it lands, and the newest set is asked for
 * then. Never a retry and never a guess at what will be picked next; a picture already drawn is
 * shown again without asking, also after a stop and a start. Nothing is asked while stopped, which
 * is whenever the page that shows the editor is not shown.
 */
export function createPreviewScheduler(options: PreviewSchedulerOptions): PreviewScheduler {
  const delayMs = options.delayMs ?? PREVIEW_DELAY_MS;
  const timers = options.timers ?? PAGE_TIMERS;
  const kept = new Map<string, string>();
  let state = NO_PREVIEW;
  let started = false;
  /** The set last asked for, whatever came of it: only a new pick asks for a set again. */
  let askedKey: string | null = null;
  let wanted: { readonly key: string; readonly set: CostumeSet } | null = null;
  let shownKey: string | null = null;
  let inFlight: string | null = null;
  let timer: unknown = null;

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
  /** Shows the wanted set's picture if it is on screen or kept already; says whether it did. */
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
    show({ ...state, loading: true, failure: null });
    options
      .load(set)
      .then(
        (answer) => (answer.ok ? { image: answer.value } : { failure: answer.error.code }),
        // The call itself failed, as a bridge that refused it does.
        () => ({ failure: "preview=callFailed" }),
      )
      .then((answer) => {
        inFlight = null;
        if (wanted?.key !== key) {
          // Superseded: this picture is dropped, and the newest set is asked for unless a pick's
          // pause is still running, which asks when it ends. Stopped, nothing is asked: the
          // newest set is not the one asked for last, so starting again asks for it.
          if (timer === null) {
            send();
          }
          return;
        }
        // Stopped, the answer is still kept and noted, and shown when it starts again.
        if ("image" in answer) {
          keep(key, answer.image);
          shownKey = key;
          show({ image: answer.image, loading: false, failure: null });
        } else {
          show({ ...state, loading: false, failure: answer.failure });
        }
      });
  };

  const keep = (key: string, image: string) => {
    kept.delete(key);
    kept.set(key, image);
    for (const oldest of kept.keys()) {
      if (kept.size <= KEPT_PICTURES) {
        break;
      }
      kept.delete(oldest);
    }
  };

  /** Asks for the wanted set: at once the first time, after the pause every time after. */
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
  };
}
