import type { Result } from "@abth/core";

import type { PictureFailure, PictureView, PictureWant } from "../shared/session-port";

export type PictureAnswer = { readonly view: PictureView } | { readonly failure: string };

/** The picture an answer holds, or null while it is unanswered or failed. */
export const viewOf = (answer: PictureAnswer | undefined): PictureView | null =>
  answer !== undefined && "view" in answer ? answer.view : null;

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

/** Time the pictures on screen take to ask again, once a read again has dropped them. */
const ASKED_AGAIN_WITHIN_MS = 300;

/** How a read again ended: whether a picture on screen kept the old one, Hiroba's not coming. */
export interface ReadAgainEnded {
  readonly failed: boolean;
}

export interface PictureLaneOptions {
  /** Never rejects: a call that failed answers a failure. `again` asks Hiroba, not the device. */
  readonly load: (
    want: PictureWant,
    again: boolean,
  ) => Promise<Result<PictureView, PictureFailure>>;
  /** The most pictures on their way at once. */
  readonly atOnce: number;
  readonly dwellMs?: number;
  readonly timers?: LaneTimers;
}

export interface AskOptions {
  /** Position on screen, top to bottom; the lower is asked for first. */
  readonly order: number;
}

export interface PictureLane {
  /** Its pictures are drawn off the window, as a snapshot's are: each is asked for at once. */
  readonly offTheWindow?: boolean;
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
  /** Drops pictures of `kinds`, each then asked of Hiroba once more, not the device, as shown. */
  readAgain(kinds: readonly PictureWant["kind"][]): void;
  /** How the last read again ended, once the pictures on screen had come; a new one each time. */
  readAgainEnded(): ReadAgainEnded | null;
  forget(): void;
  /** Calls `listener`, and changes `version`, whenever what `peek` answers may have changed. */
  subscribe(listener: () => void): () => void;
  version(): number;
}

// Small plates and art first, then the portrait (the largest), the icons, the thumbnails.
const KIND_RANK: Readonly<Record<PictureWant["kind"], number>> = {
  titlePlate: 0,
  scorePanel: 1,
  medalPlate: 2,
  myDon: 3,
  rankIcon: 4,
  crownIcon: 5,
  courseIcon: 6,
  optionIcon: 7,
  costumeItem: 8,
};

export const wantKey = (want: PictureWant): string => {
  switch (want.kind) {
    case "costumeItem":
      return `${want.kind}/${want.slot}/${want.id}`;
    case "rankIcon":
      return `${want.kind}/${want.rank}`;
    case "crownIcon":
      return `${want.kind}/${want.crown}`;
    case "courseIcon":
      return `${want.kind}/${want.difficulty}`;
    case "optionIcon":
      return `${want.kind}/${want.option}`;
    default:
      return want.kind;
  }
};

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

/** A read again under way: its kinds, its pictures on their way, and whether one did not come. */
interface ReadAgainRound {
  readonly kinds: Set<PictureWant["kind"]>;
  sent: number;
  failed: boolean;
  /** The pictures on screen have had the time to ask again. */
  asked: boolean;
  timer: unknown;
}

const answerOf = (read: Result<PictureView, PictureFailure>): PictureAnswer => {
  if (read.ok) {
    return { view: read.value };
  }
  return read.error.kept === undefined ? { failure: read.error.code } : { view: read.error.kept };
};

/** Loads Hiroba's pictures, `atOnce` at most, only for what has stayed on screen for the dwell. */
export function createPictureLane(options: PictureLaneOptions): PictureLane {
  const dwellMs = options.dwellMs ?? PICTURE_DWELL_MS;
  const timers = options.timers ?? PAGE_TIMERS;
  const answers = new Map<string, PictureAnswer>();
  const stale = new Set<string>();
  const waiters = new Set<Waiter>();
  const listeners = new Set<() => void>();
  // The keys of the pictures on their way: each is asked for once, however many wait for it.
  const sending = new Set<string>();
  // The kinds read again from Hiroba, and those of their pictures that came so since.
  const kindsAgain = new Set<PictureWant["kind"]>();
  const cameAgain = new Set<string>();
  let round: ReadAgainRound | null = null;
  let ended: ReadAgainEnded | null = null;
  let held = 0;
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

  const nextToSend = (): Waiter | null => {
    const soon = timers.now() + PICTURE_TOGETHER_MS;
    let next: Waiter | null = null;
    for (const waiter of waiters) {
      const over = waiter.ready || waiter.due <= soon;
      if (over && !sending.has(waiter.key) && (next === null || before(waiter, next) < 0)) {
        next = waiter;
      }
    }
    return next;
  };

  const pump = () => {
    while (held === 0 && sending.size < options.atOnce) {
      const next = nextToSend();
      if (next === null) {
        return;
      }
      send(next);
    }
  };

  const dueAgain = (want: PictureWant, key: string) =>
    kindsAgain.has(want.kind) && !cameAgain.has(key);

  // A read again ends once nothing of its kinds waits to be read so, or is on its way.
  const endRound = () => {
    const current = round;
    const waiting = (waiter: Waiter) =>
      current?.kinds.has(waiter.want.kind) === true && dueAgain(waiter.want, waiter.key);
    if (current === null || !current.asked || current.sent > 0 || [...waiters].some(waiting)) {
      return;
    }
    round = null;
    ended = { failed: current.failed };
    changed();
  };

  const send = ({ want, key }: Waiter) => {
    sending.add(key);
    const asked = generation;
    const again = dueAgain(want, key);
    const inRound = again && round?.kinds.has(want.kind) === true ? round : null;
    if (inRound !== null) {
      inRound.sent += 1;
    }
    options.load(want, again).then((read) => {
      sending.delete(key);
      if (inRound !== null) {
        inRound.sent -= 1;
        inRound.failed ||= !read.ok;
      }
      // Sent before its kind was read again: the device's copy, so Hiroba is asked once more.
      if (asked === generation && (again || !dueAgain(want, key))) {
        if (again) {
          cameAgain.add(key);
        }
        answers.set(key, answerOf(read));
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
      endRound();
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
          endRound();
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
    readAgain(kinds) {
      const ofKinds = (key: string) => kinds.some((kind) => isOfKind(key, kind));
      for (const kind of kinds) {
        kindsAgain.add(kind);
      }
      for (const key of [...cameAgain]) {
        if (ofKinds(key)) {
          cameAgain.delete(key);
        }
      }
      for (const key of [...answers.keys()]) {
        if (ofKinds(key)) {
          answers.delete(key);
          stale.delete(key);
        }
      }
      // One under way takes these kinds in, its pictures on their way still its own.
      const current: ReadAgainRound = round ?? {
        kinds: new Set(),
        sent: 0,
        failed: false,
        asked: false,
        timer: null,
      };
      for (const kind of kinds) {
        current.kinds.add(kind);
      }
      timers.clear(current.timer);
      current.asked = false;
      current.timer = timers.set(() => {
        current.timer = null;
        current.asked = true;
        endRound();
      }, ASKED_AGAIN_WITHIN_MS);
      round = current;
      changed();
    },
    readAgainEnded() {
      return ended;
    },
    forget() {
      generation += 1;
      for (const waiter of waiters) {
        timers.clear(waiter.timer);
      }
      waiters.clear();
      answers.clear();
      stale.clear();
      kindsAgain.clear();
      cameAgain.clear();
      timers.clear(round?.timer);
      round = null;
      ended = null;
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
