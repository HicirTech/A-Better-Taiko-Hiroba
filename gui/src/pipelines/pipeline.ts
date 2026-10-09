import { err, type Transport, type TransportRequest } from "@abth/core";

/** The kinds of group a pipeline runs. */
export type GroupKind = "read" | "exclusive" | "write";

/** A request a group sent, as the pipelines page shows it: no query and no form. */
export interface SentRequest {
  readonly method: TransportRequest["method"];
  readonly path: string;
}

/** What the asker says of a group: its operation, and how its result reads. */
export interface GroupAsked<R> {
  /** The operation, by the name the pipelines page translates: a port verb, or a picture's. */
  readonly operation: string;
  /** Null for a result that succeeded; otherwise its code for a report. */
  readonly failureOf: (result: R) => string | null;
  /** How many requests the group sends, when that is known before it starts. */
  readonly expectedRequests?: number;
}

/** A group now in the pipeline, running or waiting. */
export interface GroupNow {
  readonly id: number;
  readonly operation: string;
  readonly kind: GroupKind;
  readonly askedAt: number;
  /** Null while it waits for its turn. */
  readonly startedAt: number | null;
  readonly sent: readonly SentRequest[];
  readonly expectedRequests: number | null;
}

/** Where a group that did not succeed ended: the last request it sent, 1 for the first. */
export interface EndedAt {
  readonly index: number;
  readonly request: SentRequest;
}

interface EndedCommon {
  readonly operation: string;
  readonly kind: GroupKind;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly requests: number;
}

/** A group that has ended. A stopped one ended because the session did. */
export type EndedGroup = EndedCommon &
  (
    | { readonly outcome: "succeeded" }
    | {
        readonly outcome: "failed" | "stopped";
        readonly code: string;
        /** Null when it sent no request. */
        readonly at: EndedAt | null;
      }
  );

/** Runs groups of requests: read groups side by side, exclusive groups and writes alone. */
export interface Pipeline {
  /** Runs `group` beside other read groups, up to the pipeline's read consumers. */
  read<R>(asked: GroupAsked<R>, group: (transport: Transport) => Promise<R>): Promise<R>;
  /** Runs `group` alone: it waits for the running read groups, then goes before the rest. */
  exclusive<R>(asked: GroupAsked<R>, group: (transport: Transport) => Promise<R>): Promise<R>;
  /** `exclusive`, answering `busy` while another write of this pipeline waits or runs. */
  write<R>(asked: GroupAsked<R>, group: (transport: Transport) => Promise<R>, busy: R): Promise<R>;
  /** Ends the groups asked so far: a running one at its next request, a waiting one at once. */
  stop(): void;
  /** The groups running, then those waiting, in the order they will start. */
  now(): { readonly running: readonly GroupNow[]; readonly waiting: readonly GroupNow[] };
}

export interface PipelineOptions {
  readonly readConsumers: number;
  /** What each group's own transport sends through. */
  readonly transport: Transport;
  /** Told of each group as it ends. */
  readonly ended?: (group: EndedGroup) => void;
  /** Milliseconds since the epoch. */
  readonly clock?: () => number;
}

interface Turn {
  readonly id: number;
  readonly operation: string;
  readonly kind: GroupKind;
  readonly askedAt: number;
  readonly expectedRequests: number | null;
  readonly sent: SentRequest[];
  startedAt: number | null;
  stopped: boolean;
}

interface Waiting {
  readonly turn: Turn;
  /** True when it takes a consumer; false when a stop lets it go without one. */
  readonly start: (takesConsumer: boolean) => void;
}

/** The code of a group that threw: a fault of this app, not an answer. */
const THREW = "threw";

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname;
  } catch {
    return "?";
  }
};

export function createPipeline(options: PipelineOptions): Pipeline {
  const clock = options.clock ?? Date.now;
  const readsWaiting: Waiting[] = [];
  const alonesWaiting: Waiting[] = [];
  // Every group asked and not yet ended, in the order asked.
  const live = new Map<number, Turn>();
  let lastId = 0;
  let readsRunning = 0;
  let aloneRunning = false;
  let writing = false;

  // A group starts when its turn is given, whether or not its code has begun yet.
  const begin = (waiting: Waiting | undefined, takesConsumer: boolean) => {
    if (waiting !== undefined) {
      waiting.turn.startedAt = clock();
      waiting.start(takesConsumer);
    }
  };

  const startWhatMayRun = () => {
    if (aloneRunning) {
      return;
    }
    if (alonesWaiting.length > 0) {
      if (readsRunning === 0) {
        aloneRunning = true;
        begin(alonesWaiting.shift(), true);
      }
      return;
    }
    while (readsRunning < options.readConsumers && readsWaiting.length > 0) {
      readsRunning += 1;
      begin(readsWaiting.shift(), true);
    }
  };

  // The group's own: once the session ends, it sends nothing more.
  const transportOf = (turn: Turn): Transport => ({
    async send(request, signal) {
      if (turn.stopped) {
        return err({ kind: "cancelled", url: request.url });
      }
      turn.sent.push({ method: request.method, path: pathOf(request.url) });
      return options.transport.send(request, signal);
    },
  });

  const endedOf = (turn: Turn, code: string | null, endedAt: number): EndedGroup => {
    const common = {
      operation: turn.operation,
      kind: turn.kind,
      startedAt: turn.startedAt ?? endedAt,
      endedAt,
      requests: turn.sent.length,
    };
    if (code === null) {
      return { ...common, outcome: "succeeded" };
    }
    const last = turn.sent.at(-1);
    return {
      ...common,
      outcome: turn.stopped ? "stopped" : "failed",
      code,
      at: last === undefined ? null : { index: turn.sent.length, request: last },
    };
  };

  const inTurn = async <R>(
    kind: GroupKind,
    waiting: Waiting[],
    freed: () => void,
    asked: GroupAsked<R>,
    group: (transport: Transport) => Promise<R>,
  ): Promise<R> => {
    lastId += 1;
    const turn: Turn = {
      id: lastId,
      operation: asked.operation,
      kind,
      askedAt: clock(),
      expectedRequests: asked.expectedRequests ?? null,
      sent: [],
      startedAt: null,
      stopped: false,
    };
    live.set(turn.id, turn);
    const tookConsumer = await new Promise<boolean>((start) => {
      waiting.push({ turn, start });
      startWhatMayRun();
    });
    let code: string | null = THREW;
    try {
      const result = await group(transportOf(turn));
      code = asked.failureOf(result);
      return result;
    } finally {
      live.delete(turn.id);
      if (tookConsumer) {
        freed();
      }
      options.ended?.(endedOf(turn, code, clock()));
      startWhatMayRun();
    }
  };

  const readEnded = () => {
    readsRunning -= 1;
  };
  const aloneEnded = () => {
    aloneRunning = false;
  };
  const viewOf = (turn: Turn): GroupNow => ({
    id: turn.id,
    operation: turn.operation,
    kind: turn.kind,
    askedAt: turn.askedAt,
    startedAt: turn.startedAt,
    sent: [...turn.sent],
    expectedRequests: turn.expectedRequests,
  });

  return {
    read: (asked, group) => inTurn("read", readsWaiting, readEnded, asked, group),
    exclusive: (asked, group) => inTurn("exclusive", alonesWaiting, aloneEnded, asked, group),
    async write(asked, group, busy) {
      if (writing) {
        return busy;
      }
      writing = true;
      try {
        return await inTurn("write", alonesWaiting, aloneEnded, asked, group);
      } finally {
        writing = false;
      }
    },
    stop() {
      for (const turn of live.values()) {
        turn.stopped = true;
      }
      for (const waiting of [...readsWaiting.splice(0), ...alonesWaiting.splice(0)]) {
        begin(waiting, false);
      }
    },
    now() {
      const waiting = [...alonesWaiting, ...readsWaiting].map(({ turn }) => viewOf(turn));
      const running = [...live.values()].filter((turn) => turn.startedAt !== null).map(viewOf);
      return { running, waiting };
    },
  };
}
