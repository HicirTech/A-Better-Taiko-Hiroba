/** Verbs that ask Hiroba something run one at a time, as asked: no read lands inside a write.
 * A write asked for while another runs answers `busy`, not a second save after the first ended. */
export interface HirobaQueue {
  oneAtATime<A extends unknown[], R>(run: (...args: A) => Promise<R>): (...args: A) => Promise<R>;
  /** `oneAtATime`, answering `busy` while another write of this queue is queued or running. */
  oneWriteAtATime<A extends unknown[], R>(
    run: (...args: A) => Promise<R>,
    busy: R,
  ): (...args: A) => Promise<R>;
}

export function createHirobaQueue(): HirobaQueue {
  let queue: Promise<unknown> = Promise.resolve();
  let writing = false;
  const oneAtATime: HirobaQueue["oneAtATime"] =
    (run) =>
    (...args) => {
      const turn = queue.then(() => run(...args));
      queue = turn.catch(() => undefined);
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
  };
}
