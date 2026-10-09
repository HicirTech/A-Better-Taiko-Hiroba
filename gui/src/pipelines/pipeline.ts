/** Runs groups of requests: read groups side by side, exclusive groups and writes alone. */
export interface Pipeline {
  /** A group that runs beside other read groups, up to the pipeline's read consumers. */
  read<A extends unknown[], R>(group: (...args: A) => Promise<R>): (...args: A) => Promise<R>;
  /** A group that runs alone: it waits for the running read groups, then goes before the rest. */
  exclusive<A extends unknown[], R>(group: (...args: A) => Promise<R>): (...args: A) => Promise<R>;
  /** `exclusive`, answering `busy` while another write of this pipeline waits or runs. */
  write<A extends unknown[], R>(
    group: (...args: A) => Promise<R>,
    busy: R,
  ): (...args: A) => Promise<R>;
}

export function createPipeline(readConsumers: number): Pipeline {
  const readsWaiting: (() => void)[] = [];
  const alonesWaiting: (() => void)[] = [];
  let readsRunning = 0;
  let aloneRunning = false;
  let writing = false;

  const startWhatMayRun = () => {
    if (aloneRunning) {
      return;
    }
    if (alonesWaiting.length > 0) {
      if (readsRunning === 0) {
        aloneRunning = true;
        alonesWaiting.shift()?.();
      }
      return;
    }
    while (readsRunning < readConsumers && readsWaiting.length > 0) {
      readsRunning += 1;
      readsWaiting.shift()?.();
    }
  };

  const inTurn =
    (waiting: (() => void)[], ended: () => void) =>
    <A extends unknown[], R>(group: (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      await new Promise<void>((start) => {
        waiting.push(start);
        startWhatMayRun();
      });
      try {
        return await group(...args);
      } finally {
        ended();
        startWhatMayRun();
      }
    };

  const exclusive = inTurn(alonesWaiting, () => {
    aloneRunning = false;
  });
  return {
    read: inTurn(readsWaiting, () => {
      readsRunning -= 1;
    }),
    exclusive,
    write(group, busy) {
      const queued = exclusive(group);
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
