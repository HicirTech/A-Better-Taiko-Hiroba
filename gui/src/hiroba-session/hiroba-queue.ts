/** Verbs that ask Hiroba something run one at a time, as asked: no read lands inside a write.
 * A write asked for while another runs answers `busy`, not a second save after the first ended. */
export interface HirobaQueue {
  oneAtATime<A extends unknown[], R>(run: (...args: A) => Promise<R>): (...args: A) => Promise<R>;
  /** `oneAtATime`, answering `busy` while another write of this queue is queued or running. */
  oneWriteAtATime<A extends unknown[], R>(
    run: (...args: A) => Promise<R>,
    busy: R,
  ): (...args: A) => Promise<R>;
  /** Resolves once no turn has run or waited for `quietMs`. */
  whenQuiet(quietMs: number): Promise<void>;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createHirobaQueue(now: () => number = Date.now): HirobaQueue {
  let queue: Promise<unknown> = Promise.resolve();
  let writing = false;
  let turns = 0;
  let lastEnded = Number.NEGATIVE_INFINITY;
  const oneAtATime: HirobaQueue["oneAtATime"] =
    (run) =>
    (...args) => {
      turns += 1;
      const turn = queue.then(() => run(...args));
      queue = turn
        .catch(() => undefined)
        .then(() => {
          turns -= 1;
          lastEnded = now();
        });
      return turn;
    };
  return {
    oneAtATime,
    oneWriteAtATime(run, busy) {
      const queued = oneAtATime(run);
      return async (...args) => {
        if (writing) {
          return busy;
        }
        writing = true;
        try {
          return await queued(...args);
        } finally {
          writing = false;
        }
      };
    },
    async whenQuiet(quietMs) {
      for (;;) {
        await queue;
        const quietFor = now() - lastEnded;
        if (turns === 0 && quietFor >= quietMs) {
          return;
        }
        await sleep(turns === 0 ? quietMs - quietFor : 0);
      }
    },
  };
}
