import type { Result } from "@abth/core";

import type { PictureFailure, PictureView, PictureWant } from "../session-port";

/** What the lane knows of one picture: the picture, or the code of why it did not come. */
export type PictureAnswer = { readonly view: PictureView } | { readonly failure: string };

/** Timers that can be cleared, and the clock they run on: the page's own, or a test's. */
export interface LaneTimers {
  set(run: () => void, ms: number): unknown;
  clear(timer: unknown): void;
  /** The time now, in milliseconds, on the timers' clock. */
  now(): number;
}

/** How long a picture must stay on screen before it is asked for, so a fling past it asks nothing. */
export const PICTURE_DWELL_MS = 150;

/**
 * How close to its end a dwell counts as over, about a frame. Cells that come on screen together
 * each hear of it from their own observer, a little apart and in no set order, so their dwells end
 * a little apart too: when the first ends, those ending within this are taken as over with it, and
 * the pictures go in their order on screen, not in the order their timers happen to fire.
 */
export const PICTURE_TOGETHER_MS = 16;

export interface PictureLaneOptions {
  /** One picture from the platform: the port's readPicture. */
  readonly load: (want: PictureWant) => Promise<Result<PictureView, PictureFailure>>;
  readonly dwellMs?: number;
  readonly timers?: LaneTimers;
}

export interface AskOptions {
  /** Where the picture sits on screen, top to bottom: the lower asked for first. */
  readonly order: number;
}

export interface PictureLane {
  /** What the lane has of `want` this run, or undefined while it has nothing. */
  peek(want: PictureWant): PictureAnswer | undefined;
  /**
   * Whether what the lane has of `want` stands: an answer not renewed since. One that does not is
   * asked for once it is on screen, while `peek` still gives what the lane had.
   */
  settled(want: PictureWant): boolean;
  /**
   * `want` is on screen: it is asked for once it has stayed there for the dwell, in its turn. The
   * function returned takes it back, as its picture leaves the screen; one already sent comes all
   * the same, and is kept.
   */
  ask(want: PictureWant, options: AskOptions): () => void;
  /** Sends nothing more until as many `release` calls: while a write runs. */
  hold(): void;
  release(): void;
  /** Lets pictures that did not come, of `kind` or of every kind, be asked for again. */
  forgetFailures(kind?: PictureWant["kind"]): void;
  /**
   * The pictures of `kind` may have changed on Hiroba, as the title plate may with each read of my
   * page: each is asked for again once it is on screen, and what the lane had is still shown until
   * the answer comes, so nothing flickers. One that did not come is forgotten.
   */
  renew(kind: PictureWant["kind"]): void;
  /** Forgets everything, and sends nothing asked for before: at sign-out. */
  forget(): void;
  /** Calls `listener` whenever what `peek` answers may have changed. */
  subscribe(listener: () => void): () => void;
  /** A number that changes whenever what `peek` answers may have changed. */
  version(): number;
}

/**
 * Which pictures go first: the identity card's before the editor's thumbnails, whatever their
 * order on screen. Each kind is ranked here as it arrives.
 */
const KIND_RANK: Readonly<Record<PictureWant["kind"], number>> = {
  titlePlate: 0,
  costumeItem: 1,
};

/** One key per picture: its kind, then its numbers if it has any. */
export const wantKey = (want: PictureWant): string =>
  want.kind === "costumeItem" ? `${want.kind}/${want.slot}/${want.id}` : want.kind;

/** Whether `key` is a picture of `kind`. */
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
  /** When its dwell ends, on the timers' clock. */
  readonly due: number;
  /** Its dwell's timer has fired. */
  ready: boolean;
  timer: unknown;
}

/**
 * The window's side of Hiroba's pictures, one per port: it asks the platform for one picture at a
 * time, only for what has stayed on screen for the dwell, the identity card first and then in
 * order down the screen. It remembers every answer for the run, so a picture shown once is shown
 * again without asking, until its kind is renewed; a picture that did not come is not asked for
 * again until its failures are forgotten. Nothing is sent while it is held, which is whenever a
 * write runs.
 */
export function createPictureLane(options: PictureLaneOptions): PictureLane {
  const dwellMs = options.dwellMs ?? PICTURE_DWELL_MS;
  const timers = options.timers ?? PAGE_TIMERS;
  const answers = new Map<string, PictureAnswer>();
  /** Answers renewed since they came: still shown, and asked for again. */
  const stale = new Set<string>();
  const waiters = new Set<Waiter>();
  const listeners = new Set<() => void>();
  let held = 0;
  let sending = false;
  let seq = 0;
  let changes = 0;
  /** Bumped by forget(): an answer asked for before it is dropped. */
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
