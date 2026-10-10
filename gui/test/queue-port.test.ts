import { describe, expect, test } from "bun:test";
import { err, ok, SONG_PICKER_REQUESTS, type Transport } from "@abth/core";

import {
  BUSY_OUTCOME,
  keepHirobaEnded,
  PICTURE_OPERATION,
  queuePort,
  viewOfPipelines,
  writeFailure,
} from "../src/hiroba-session";
import {
  createMemoryPipelineStore,
  createPipeline,
  createPipelineLog,
  type EndedGroup,
  EXTERNAL_READ_CONSUMERS,
  IO_READ_CONSUMERS,
} from "../src/pipelines";
import {
  BRIDGE_CHANNELS,
  type HirobaSessionPort,
  PORT_ARGUMENTS,
  PORT_QUEUEING,
  type PortImplementation,
  type VerbQueueing,
  type WriteOutcomeView,
} from "../src/session-port";

type Verb = keyof HirobaSessionPort;
const VERBS = Object.keys(PORT_QUEUEING) as Verb[];
const queuedAs = (how: VerbQueueing) => VERBS.filter((verb) => PORT_QUEUEING[verb] === how);
const READS = queuedAs("read");
const EXCLUSIVE = queuedAs("exclusive");
const WRITES = queuedAs("write");
const EXTERNAL = queuedAs("external");
const UNQUEUED = queuedAs("unqueued");

/** Gives the next turn of the event loop to whatever the queue has ready to run. */
const settle = () => Bun.sleep(1);

/** A transport no verb here sends through. */
const UNUSED: Transport = {
  send: async (request) => err({ kind: "unreachable", url: request.url }),
};

function watchedPort() {
  const events: string[] = [];
  const gates = new Map<Verb, () => void>();
  const verbs = Object.fromEntries(
    VERBS.map((verb) => [
      verb,
      async (...received: unknown[]) => {
        // A verb in a pipeline gets its group's transport first.
        const args = PORT_QUEUEING[verb] === "unqueued" ? received : received.slice(1);
        events.push(`begin ${verb}`);
        await new Promise<void>((resolve) => gates.set(verb, resolve));
        events.push(`end ${verb}`);
        return ok({ verb, args });
      },
    ]),
  ) as unknown as PortImplementation;
  const port = queuePort(
    {
      io: createPipeline({ readConsumers: IO_READ_CONSUMERS, transport: UNUSED }),
      external: createPipeline({ readConsumers: EXTERNAL_READ_CONSUMERS, transport: UNUSED }),
    },
    verbs,
  );
  const ask = (verb: Verb, ...args: unknown[]) =>
    (port[verb] as (...values: unknown[]) => Promise<unknown>)(...args);
  const letGo = async (verb: Verb) => {
    gates.get(verb)?.();
    await settle();
  };
  return { events, ask, letGo };
}

describe("PORT_QUEUEING", () => {
  test("places every verb of the port, the bridge's and the argument checks' alike", () => {
    const placed: string[] = [...VERBS].sort();
    expect(placed).toEqual(Object.keys(BRIDGE_CHANNELS).sort());
    expect(placed).toEqual(Object.keys(PORT_ARGUMENTS).sort());
  });

  test("queues the verbs that ask Hiroba for a page, and sends the changes as writes", () => {
    expect(READS).toEqual([
      "readProfile",
      "openCostumeEditor",
      "openTitleEditor",
      "previewCostume",
      "openFavorites",
    ]);
    expect(WRITES).toEqual([
      "changeCostume",
      "changeTitle",
      "changeName",
      "changeFolder",
      "changeFavoriteSong",
    ]);
  });

  test("runs the picker alone, as it carries a form token, and other sites in their own pipeline", () => {
    expect(EXCLUSIVE).toEqual(["readSongPicker"]);
    expect(EXTERNAL).toEqual(["readUpdateFeed", "readSongCatalogue", "readChineseNames"]);
  });
});

describe("queuePort", () => {
  describe.each(WRITES)("while %s runs", (running) => {
    test.each(READS)("a %s asked for waits until it has ended, and then goes", async (read) => {
      const { events, ask, letGo } = watchedPort();
      const writing = ask(running);
      await settle();
      const reading = ask(read);
      await settle();
      expect(events).toEqual([`begin ${running}`]);

      await letGo(running);
      expect(events).toEqual([`begin ${running}`, `end ${running}`, `begin ${read}`]);
      await letGo(read);
      await Promise.all([writing, reading]);
      expect(events.slice(-1)).toEqual([`end ${read}`]);
    });

    test.each(WRITES)("a %s asked for answers busy, and never begins", async (other) => {
      const { events, ask, letGo } = watchedPort();
      const writing = ask(running);
      await settle();
      expect(await ask(other)).toEqual(BUSY_OUTCOME);
      await letGo(running);
      await writing;
      expect(events).toEqual([`begin ${running}`, `end ${running}`]);
    });

    test.each(EXCLUSIVE)(
      "a %s asked for waits until it has ended, and is not busy",
      async (alone) => {
        const { events, ask, letGo } = watchedPort();
        const writing = ask(running);
        await settle();
        const picking = ask(alone);
        await settle();
        expect(events).toEqual([`begin ${running}`]);

        await letGo(running);
        expect(events).toEqual([`begin ${running}`, `end ${running}`, `begin ${alone}`]);
        await letGo(alone);
        expect(await picking).not.toEqual(BUSY_OUTCOME);
        await writing;
      },
    );

    test.each([...EXTERNAL, ...UNQUEUED])("a %s asked for is not held up", async (free) => {
      const { events, ask, letGo } = watchedPort();
      const writing = ask(running);
      await settle();
      const answered = ask(free);
      await settle();
      expect(events).toEqual([`begin ${running}`, `begin ${free}`]);
      await letGo(free);
      await letGo(running);
      await Promise.all([writing, answered]);
    });
  });

  test("runs the reads side by side, as many at once as the IO pipeline's read consumers", async () => {
    const { events, ask, letGo } = watchedPort();
    const asked = READS.map((read) => ask(read));
    await settle();
    expect(events).toEqual(READS.slice(0, IO_READ_CONSUMERS).map((read) => `begin ${read}`));
    for (const read of READS) {
      await letGo(read);
    }
    await Promise.all(asked);
    expect(events.filter((event) => event.startsWith("end "))).toHaveLength(READS.length);
  });

  test("a write asked for behind a read waits for it, and a second write meanwhile answers busy", async () => {
    const { events, ask, letGo } = watchedPort();
    const reading = ask("readProfile");
    const writing = ask("changeCostume");
    await settle();
    expect(events).toEqual(["begin readProfile"]);
    expect(await ask("changeName")).toEqual(BUSY_OUTCOME);
    await letGo("readProfile");
    expect(events).toEqual(["begin readProfile", "end readProfile", "begin changeCostume"]);
    await letGo("changeCostume");
    await Promise.all([reading, writing]);
  });

  test("hands each verb its own arguments and gives back its own answer", async () => {
    const { ask, letGo } = watchedPort();
    const answered = ask("previewCostume", { colorFace: 3 });
    await settle();
    await letGo("previewCostume");
    expect(await answered).toEqual(ok({ verb: "previewCostume", args: [{ colorFace: 3 }] }));
  });
});

describe("queuePort, as the pipelines page sees its groups", () => {
  function told(answer: (verb: Verb) => Promise<unknown>) {
    const ended: EndedGroup[] = [];
    const tell = (group: EndedGroup) => {
      ended.push(group);
    };
    const pipelines = {
      io: createPipeline({ readConsumers: IO_READ_CONSUMERS, transport: UNUSED, ended: tell }),
      external: createPipeline({
        readConsumers: EXTERNAL_READ_CONSUMERS,
        transport: UNUSED,
        ended: tell,
      }),
    };
    const verbs = Object.fromEntries(
      VERBS.map((verb) => [verb, () => answer(verb)]),
    ) as unknown as PortImplementation;
    const port = queuePort(pipelines, verbs);
    const ask = (verb: Verb) => (port[verb] as () => Promise<unknown>)();
    return { ended, pipelines, ask };
  }

  test("names each group by its verb, and reads a read's failure as its code", async () => {
    const { ended, ask } = told(async () => err({ kind: "unexpectedPage", detail: "status=500" }));
    await ask("openFavorites");
    await ask("readChineseNames");

    expect(ended).toEqual([
      expect.objectContaining({
        operation: "openFavorites",
        kind: "read",
        outcome: "failed",
        code: "unexpectedPage status=500",
      }),
      expect.objectContaining({
        operation: "readChineseNames",
        kind: "read",
        outcome: "failed",
        code: "unexpectedPage status=500",
      }),
    ]);
  });

  test("reads a write that had nothing to save as done, and any other by its kind", async () => {
    const { ended, ask } = told(async (verb) =>
      verb === "changeCostume" ? { kind: "nothingToChange" } : { kind: "changedSincePreview" },
    );
    await ask("changeCostume");
    await ask("changeName");

    expect(ended).toEqual([
      expect.objectContaining({ operation: "changeCostume", kind: "write", outcome: "succeeded" }),
      expect.objectContaining({
        operation: "changeName",
        kind: "write",
        outcome: "failed",
        code: "changedSincePreview",
      }),
    ]);
  });

  test("gives the picker's requests before it starts", async () => {
    let letGo: () => void = () => undefined;
    const { pipelines, ask } = told(
      () =>
        new Promise((resolve) => {
          letGo = () => resolve(ok(null));
        }),
    );
    const picking = ask("readSongPicker");
    await settle();

    expect(pipelines.io.now().running).toEqual([
      expect.objectContaining({
        operation: "readSongPicker",
        kind: "exclusive",
        expectedRequests: SONG_PICKER_REQUESTS,
      }),
    ]);
    letGo();
    await picking;
  });
});

describe("Hiroba's pictures, apart from its other groups", () => {
  const log = () =>
    createPipelineLog({ store: createMemoryPipelineStore(), later: () => undefined });
  const ended = (overrides: Partial<EndedGroup> = {}): EndedGroup =>
    ({
      operation: "readProfile",
      kind: "read",
      startedAt: 1000,
      endedAt: 1300,
      requests: 1,
      outcome: "succeeded",
      ...overrides,
    }) as EndedGroup;

  test("keeps a picture apart from the rest, and none that asked Hiroba nothing", () => {
    const logs = { io: log(), pictures: log() };
    const keep = keepHirobaEnded(logs);
    const fetched = ended({ operation: PICTURE_OPERATION, subject: "myDon" });
    keep(ended());
    keep(fetched);
    keep(ended({ operation: PICTURE_OPERATION, subject: "rankIcon", requests: 0 }));

    expect(logs.io.history(12).ended).toEqual([ended()]);
    expect(logs.pictures.history(12).ended).toEqual([fetched]);
  });

  test("shows the pictures running and waiting in their own view, and the rest in Hiroba's", async () => {
    const io = createPipeline({ readConsumers: 1, transport: UNUSED });
    const external = createPipeline({ readConsumers: 1, transport: UNUSED });
    let letGo: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      letGo = resolve;
    });
    const asked = (operation: string, subject?: string) => ({
      operation,
      ...(subject === undefined ? {} : { subject }),
      failureOf: () => null,
    });
    const fetching = io.read(asked(PICTURE_OPERATION, "myDon"), () => held);
    const reading = io.read(asked("readProfile"), async () => undefined);
    const nextPicture = io.read(asked(PICTURE_OPERATION, "titlePlate"), async () => undefined);
    await settle();

    const view = viewOfPipelines(
      { io, external },
      { io: log(), pictures: log(), external: log() },
      12,
    );
    expect(view.pictures.running).toEqual([expect.objectContaining({ subject: "myDon" })]);
    expect(view.pictures.waiting).toEqual([expect.objectContaining({ subject: "titlePlate" })]);
    expect(view.io.running).toEqual([]);
    expect(view.io.waiting).toEqual([expect.objectContaining({ operation: "readProfile" })]);
    letGo();
    await Promise.all([fetching, reading, nextPicture]);
  });
});

describe("writeFailure", () => {
  test.each<[outcome: WriteOutcomeView<unknown>, failure: string | null]>([
    [{ kind: "nothingToChange" }, null],
    [{ kind: "readFailed", failure: { kind: "timedOut" } }, "readFailed timedOut"],
    [
      { kind: "stoppedBeforeWrite", reason: "precheckRejected", code: "result=705" },
      "stoppedBeforeWrite result=705",
    ],
    [{ kind: "maintenance" }, "maintenance"],
    [{ kind: "interrupted" }, "interrupted"],
  ])("reads %p as %p", (outcome, failure) => {
    expect(writeFailure(outcome)).toBe(failure);
  });
});
