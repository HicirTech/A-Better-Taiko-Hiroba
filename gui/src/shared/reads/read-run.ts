import { err, type Result } from "@abth/core";

import { settled } from "../settled";

/** Where a read of one kind of data stands: every kind of data says it the same way. */
export type ReadPhase = "unread" | "reading" | "read" | "failed";

export interface ReadStatus<F, P> {
  readonly phase: ReadPhase;
  /** Why the last read failed, while `phase` is failed. */
  readonly failure: F | null;
  /** How far the read running has come, where it can tell. */
  readonly progress: P | null;
}

export interface ReadRunOptions<F> {
  /** The failure a read ends with when its call, or keeping what it brought, threw instead. */
  readonly callFailed: F;
  /** Whether a failure ended the session: its read is let go, and `onSessionEnded` is told. */
  readonly endsTheSession?: (failure: F) => boolean;
  readonly onSessionEnded?: (failure: F) => void;
  /** Calls `tick` every `ms` until the function it answers is called; a timer by default. */
  readonly every?: (ms: number, tick: () => void) => () => void;
}

export interface RunHow<R, F, P> {
  /** Asked again and again while the read runs and someone listens, for how far it has come. */
  readonly progress?: () => Promise<P | null>;
  /** Keeps what the read brought, before the read is said to have ended. */
  readonly keep?: (result: Result<R, F>) => void | Promise<void>;
}

/** One kind of data's reads: one at a time, let go when their session ends, and how they stand. */
export interface ReadRun<F, P> {
  status(): ReadStatus<F, P>;
  subscribe(listener: () => void): () => void;
  /** Runs `ask` unless a read of this session runs; its answer, or null when the run was let go. */
  run<R>(ask: () => Promise<Result<R, F>>, how?: RunHow<R, F, P>): Promise<Result<R, F> | null>;
  /** Forgets how the last read ended, so a failure is said until the data's page opens again. */
  settle(): void;
  /** Lets go of the read on its way and of how the last one ended, as another session begins. */
  forget(): void;
}

export const PROGRESS_POLL_MS = 200;

const UNREAD = { phase: "unread", failure: null, progress: null } as const;

const timer = (ms: number, tick: () => void) => {
  const id = setInterval(tick, ms);
  return () => clearInterval(id);
};

export function createReadRun<F, P = never>(options: ReadRunOptions<F>): ReadRun<F, P> {
  const every = options.every ?? timer;
  const failedCall = () => err(options.callFailed);
  const listeners = new Set<() => void>();
  let status: ReadStatus<F, P> = UNREAD;
  let session = 0;
  let running: number | null = null;
  // Whether this session has read the data once: a settled failure leaves it read, or unread.
  let readOnce = false;
  // The running read's progress, asked only while someone listens: an owner gone stops asking.
  let progressOf: (() => Promise<P | null>) | null = null;
  let asking: { readonly of: () => Promise<P | null>; readonly stop: () => void } | null = null;

  const put = (next: ReadStatus<F, P>) => {
    status = next;
    for (const listener of [...listeners]) {
      listener();
    }
  };

  const askWhileHeard = () => {
    const wanted = listeners.size === 0 ? null : progressOf;
    if (asking !== null && asking.of !== wanted) {
      asking.stop();
      asking = null;
    }
    if (wanted !== null && asking === null) {
      const stop = every(PROGRESS_POLL_MS, () => {
        void wanted().then((now) => {
          if (now !== null && progressOf === wanted) {
            put({ ...status, progress: now });
          }
        });
      });
      asking = { of: wanted, stop };
    }
  };

  return {
    status: () => status,
    subscribe(listener) {
      listeners.add(listener);
      askWhileHeard();
      return () => {
        listeners.delete(listener);
        askWhileHeard();
      };
    },
    async run(ask, how = {}) {
      const mine = session;
      if (running === mine) {
        return null;
      }
      running = mine;
      put({ phase: "reading", failure: null, progress: null });
      const { progress, keep } = how;
      progressOf = progress ?? null;
      askWhileHeard();
      try {
        const result = await settled(ask, failedCall);
        if (mine !== session) {
          return null;
        }
        if (!result.ok && options.endsTheSession?.(result.error) === true) {
          put(UNREAD);
          options.onSessionEnded?.(result.error);
          return null;
        }
        const ended = await settled(async () => {
          await keep?.(result);
          return result;
        }, failedCall);
        if (mine !== session) {
          return null;
        }
        readOnce ||= ended.ok;
        put(
          ended.ok
            ? { phase: "read", failure: null, progress: null }
            : { phase: "failed", failure: ended.error, progress: null },
        );
        return ended;
      } finally {
        if (running === mine) {
          running = null;
          progressOf = null;
          askWhileHeard();
        }
      }
    },
    settle() {
      if (status.phase === "failed") {
        put(readOnce ? { phase: "read", failure: null, progress: null } : UNREAD);
      }
    },
    forget() {
      session += 1;
      running = null;
      readOnce = false;
      progressOf = null;
      askWhileHeard();
      put(UNREAD);
    },
  };
}

/** Settles once `run` has no read on its way, such as a page's first, so the next can start. */
export function readsIdle<F, P>(run: ReadRun<F, P>): Promise<void> {
  return new Promise((resolve) => {
    const idle = () => run.status().phase !== "reading";
    if (idle()) {
      resolve();
      return;
    }

    const stop = run.subscribe(() => {
      if (idle()) {
        stop();
        resolve();
      }
    });
  });
}
