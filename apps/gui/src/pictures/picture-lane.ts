import type { Result } from "@abth/core";

import type { PictureFailure, PictureView, PictureWant } from "../session-port";

export type PictureAnswer = { readonly view: PictureView } | { readonly failure: string };

export interface LaneTimers {
  set(run: () => void, ms: number): unknown;
  clear(timer: unknown): void;
  /** Milliseconds, on the timers' own clock. */
  now(): number;
}

/** A fling past a picture asks nothing: it must stay on screen this long first. */
export const PICTURE_DWELL_MS = 150;

/** Dwells ending within this of the first end with it, so pictures go in screen order. */
export const PICTURE_TOGETHER_MS = 16;

export interface PictureLaneOptions {
  readonly load: (want: PictureWant) => Promise<Result<PictureView, PictureFailure>>;
  readonly dwellMs?: number;
  readonly timers?: LaneTimers;
}

export interface AskOptions {
  /** Position on screen, top to bottom; the lower is asked for first. */
  readonly order: number;
}

export interface PictureLane {
  peek(want: PictureWant): PictureAnswer | undefined;
  /** True when the lane has an answer for `want` that no renewal has made stale. */
  settled(want: PictureWant): boolean;
  /** Puts `want` on screen: asked for after the dwell. The returned function takes it back. */
  ask(want: PictureWant, options: AskOptions): () => void;
  /** Pauses sending until as many `release` calls; held while a write runs. */
  hold(): void;
  release(): void;
  forgetFailures(kind?: PictureWant["kind"]): void;
  /** Marks pictures of `kind` as possibly changed: asked for again, the old one shown meanwhile. */
  renew(kind: PictureWant["kind"]): void;
  forget(): void;
  /** Calls `listener`, and changes `version`, whenever what `peek` answers may have changed. */
  subscribe(listener: () => void): () => void;
  version(): number;
}

// Small plates and art first, then the portrait (the largest), then the editor's thumbnails.
const KIND_RANK: Readonly<Record<PictureWant["kind"], number>> = {
  titlePlate: 0,
  scorePanel: 1,
  medalPlate: 2,
  myDon: 3,
  costumeItem: 4,
};

export const wantKey = (want: PictureWant): string =>
  want.kind === "costumeItem" ? `${want.kind}/${want.slot}/${want.id}` : want.kind;

const isOfKind = (key: string, kind: PictureWant["kind"]) =>
  key === kind || key.startsWith(`${kind}/`);

const PAGE_TIMERS: LaneTimers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
  now: () => performance.now(),
};

interface Waiter {
  readonly want: PictureWant;
  readonly key: string;
  readonly order: number;
  readonly seq: number;
  readonly due: number;
  ready: boolean;
  timer: unknown;
}

/** Loads Hiroba's pictures one at a time, only for what has stayed on screen for the dwell. */
export function createPictureLane(options: PictureLaneOptions): PictureLane {
  const dwellMs = options.dwellMs ?? PICTURE_DWELL_MS;
  const timers = options.timers ?? PAGE_TIMERS;
  const answers = new Map<string, PictureAnswer>();
  const stale = new Set<string>();
  const waiters = new Set<Waiter>();
  const listeners = new Set<() => void>();
  let held = 0;
  let sending = false;
  let seq = 0;
  let changes = 0;
  let generation = 0;

  const changed = () => {
    changes += 1;
    for (const listener of [...listeners]) {
      listener();
    }
  };

  const before = (one: Waiter, other: Waiter) =>
    KIND_RANK[one.want.kind] - KIND_RANK[other.want.kind] ||
    one.order - other.order ||
    one.seq - other.seq;

  const pump = () => {
    if (held > 0 || sending) {
      return;
    }
    const soon = timers.now() + PICTURE_TOGETHER_MS;
    let next: Waiter | null = null;
    for (const waiter of waiters) {
      const over = waiter.ready || waiter.due <= soon;
      if (over && (next === null || before(waiter, next) < 0)) {
        next = waiter;
      }
    }
    if (next === null) {
      return;
    }
    const { want, key } = next;
    sending = true;
    const asked = generation;
    options
      .load(want)
      .then(
        (read): PictureAnswer => (read.ok ? { view: read.value } : { failure: read.error.code }),
        // The call itself failed, as a bridge that refused it does.
        (): PictureAnswer => ({ failure: `${want.kind}=callFailed` }),
      )
      .then((answer) => {
        sending = false;
        if (asked === generation) {
          answers.set(key, answer);
          stale.delete(key);
          for (const waiter of [...waiters]) {
            if (waiter.key === key) {
              timers.clear(waiter.timer);
              waiters.delete(waiter);
            }
          }
          changed();
        }
        pump();
      });
  };

  return {
    peek(want) {
      return answers.get(wantKey(want));
    },
    settled(want) {
      const key = wantKey(want);
      return answers.has(key) && !stale.has(key);
    },
    ask(want, { order }) {
      const key = wantKey(want);
      if (answers.has(key) && !stale.has(key)) {
        return () => undefined;
      }
      const waiter: Waiter = {
        want,
        key,
        order,
        seq: seq++,
        due: timers.now() + dwellMs,
        ready: false,
        timer: null,
      };
      waiters.add(waiter);
      waiter.timer = timers.set(() => {
        waiter.timer = null;
        waiter.ready = true;
        pump();
      }, dwellMs);
      return () => {
        if (waiters.delete(waiter)) {
          timers.clear(waiter.timer);
        }
      };
    },
    hold() {
      held += 1;
    },
    release() {
      held = Math.max(0, held - 1);
      pump();
    },
    forgetFailures(kind) {
      let forgot = false;
      for (const [key, answer] of answers) {
        if ("failure" in answer && (kind === undefined || isOfKind(key, kind))) {
          answers.delete(key);
          forgot = true;
        }
      }
      if (forgot) {
        changed();
      }
    },
    renew(kind) {
      let renewed = false;
      for (const [key, answer] of answers) {
        if (isOfKind(key, kind)) {
          if ("failure" in answer) {
            answers.delete(key);
          } else {
            stale.add(key);
          }
          renewed = true;
        }
      }
      if (renewed) {
        changed();
      }
    },
    forget() {
      generation += 1;
      for (const waiter of waiters) {
        timers.clear(waiter.timer);
      }
      waiters.clear();
      answers.clear();
      stale.clear();
      changed();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    version() {
      return changes;
    },
  };
}
