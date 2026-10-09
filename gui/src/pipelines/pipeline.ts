import { err, type Transport } from "@abth/core";

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
  /** `transport` for this pipeline's groups: it sends nothing for one asked before a `stop`. */
  gate(transport: Transport): Transport;
  /** Ends the groups asked so far, a running one at its next request; later ones wait for them. */
  stop(): void;
}

export function createPipeline(readConsumers: number): Pipeline {
  // A waiting group's start: true when it takes a consumer, false when a stop lets it go without.
  const readsWaiting: ((takesConsumer: boolean) => void)[] = [];
  const alonesWaiting: ((takesConsumer: boolean) => void)[] = [];
  let readsRunning = 0;
  let aloneRunning = false;
  let writing = false;
  let stops = 0;
  // The groups asked since the last stop, and those asked before it that have not ended yet.
  let asked = 0;
  let ending = 0;

  const startWhatMayRun = () => {
    if (aloneRunning || ending > 0) {
      return;
    }
    if (alonesWaiting.length > 0) {
      if (readsRunning === 0) {
        aloneRunning = true;
        alonesWaiting.shift()?.(true);
      }
      return;
    }
    while (readsRunning < readConsumers && readsWaiting.length > 0) {
      readsRunning += 1;
      readsWaiting.shift()?.(true);
    }
  };

  const inTurn =
    (waiting: ((takesConsumer: boolean) => void)[], ended: () => void) =>
    <A extends unknown[], R>(group: (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      const askedIn = stops;
      asked += 1;
      const tookConsumer = await new Promise<boolean>((start) => {
        waiting.push(start);
        startWhatMayRun();
      });
      try {
        return await group(...args);
      } finally {
        if (tookConsumer) {
          ended();
        }
        if (askedIn === stops) {
          asked -= 1;
        } else {
          ending -= 1;
        }
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
    gate(transport) {
      return {
        // Only a group asked before the last stop runs while `ending` is above 0.
        async send(request, signal) {
          if (ending > 0) {
            return err({ kind: "cancelled", url: request.url });
          }
          return transport.send(request, signal);
        },
      };
    },
    stop() {
      stops += 1;
      ending += asked;
      asked = 0;
      for (const start of [...readsWaiting.splice(0), ...alonesWaiting.splice(0)]) {
        start(false);
      }
    },
  };
}
