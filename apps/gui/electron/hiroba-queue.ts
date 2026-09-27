/**
 * The order the desktop asks Hiroba things in. Every verb that asks Hiroba something runs one at a
 * time, in the order asked: a read never lands between a write's posts and its read-back, and two
 * writes never interleave.
 *
 * A write is not queued behind another write, though. One asked for while another is queued or
 * running answers `busy` at once and runs not at all: a button pressed twice, or two buttons for
 * one write, must not become a second save sent after the first has ended, whatever it found.
 */
export interface HirobaQueue {
  /** `run`, made to wait for every verb asked for before it. */
  oneAtATime<A extends unknown[], R>(run: (...args: A) => Promise<R>): (...args: A) => Promise<R>;
  /**
   * `run` queued as `oneAtATime` makes it, and answering `busy` instead while another write made
   * by this function is queued or running.
   */
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
