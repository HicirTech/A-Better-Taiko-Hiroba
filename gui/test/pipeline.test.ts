import { describe, expect, test } from "bun:test";
import { err, ok, type Result, type Transport } from "@abth/core";

import {
  createPipeline,
  type EndedGroup,
  type GroupAsked,
  IO_READ_CONSUMERS,
} from "../src/pipelines";

const HIROBA = "https://donderhiroba.jp";

/** Gives whatever the pipeline has let start a turn of the event loop to begin. */
const settle = () => Bun.sleep(0);

/** A transport no group here sends through. */
const UNUSED: Transport = {
  send: async (request) => err({ kind: "unreachable", url: request.url }),
};

/** A group whose result never reads as a failure. */
const asked = (operation: string): GroupAsked<unknown> => ({ operation, failureOf: () => null });

/** A group that logs when it starts and ends, and ends only when its test lets it. */
function held(name: string, log: string[]) {
  let letGo: () => void = () => undefined;
  const run = async () => {
    log.push(`${name} start`);
    await new Promise<void>((resolve) => {
      letGo = resolve;
    });
    log.push(`${name} end`);
    return name;
  };
  const release = async () => {
    await settle();
    letGo();
    await settle();
  };
  return { run, release };
}

/** A transport that logs each path it is sent, and answers each only when its test lets it. */
function heldTransport() {
  const sent: string[] = [];
  const answers: (() => void)[] = [];
  const transport: Transport = {
    async send(request) {
      sent.push(new URL(request.url).pathname);
      await new Promise<void>((resolve) => answers.push(resolve));
      return ok({ status: 200, url: request.url, headers: {}, body: new Uint8Array() });
    },
  };
  const answer = async () => {
    await settle();
    answers.shift()?.();
    await settle();
  };
  return { transport, sent, answer };
}

/** A group that GETs each of `paths` in turn, and gives up at the first that gets no answer. */
const walk = (paths: readonly string[]) => async (transport: Transport) => {
  for (const path of paths) {
    const sent = await transport.send({ method: "GET", url: `${HIROBA}${path}` });
    if (!sent.ok) {
      return `${path}: ${sent.error.kind}`;
    }
  }
  return "done";
};

/** A walk's group as its asker sees it: anything but "done" failed. */
const walking = (operation: string): GroupAsked<string> => ({
  operation,
  failureOf: (result) => (result === "done" ? null : result),
});

describe("createPipeline", () => {
  test("with one read consumer, runs every group one at a time in the order asked", async () => {
    const log: string[] = [];
    const pipeline = createPipeline({ readConsumers: 1, transport: UNUSED });
    const first = held("first", log);
    const write = held("write", log);
    const second = held("second", log);
    const reading = pipeline.read(asked("first"), first.run);
    const writing = pipeline.write(asked("write"), write.run, "busy");
    await settle();
    const readingAgain = pipeline.read(asked("second"), second.run);
    await first.release();
    await write.release();
    await second.release();
    expect(await Promise.all([reading, writing, readingAgain])).toEqual([
      "first",
      "write",
      "second",
    ]);
    expect(log).toEqual([
      "first start",
      "first end",
      "write start",
      "write end",
      "second start",
      "second end",
    ]);
  });

  test("runs read groups side by side up to its read consumers, the next as one ends", async () => {
    const log: string[] = [];
    const pipeline = createPipeline({ readConsumers: 2, transport: UNUSED });
    const a = held("a", log);
    const b = held("b", log);
    const c = held("c", log);
    const reads = [
      pipeline.read(asked("a"), a.run),
      pipeline.read(asked("b"), b.run),
      pipeline.read(asked("c"), c.run),
    ];
    await settle();
    expect(log).toEqual(["a start", "b start"]);
    await a.release();
    expect(log).toEqual(["a start", "b start", "a end", "c start"]);
    await b.release();
    await c.release();
    expect(await Promise.all(reads)).toEqual(["a", "b", "c"]);
  });

  test("Hiroba's pipeline runs its read consumers' worth of groups, and one more as one ends", async () => {
    const log: string[] = [];
    const pipeline = createPipeline({ readConsumers: IO_READ_CONSUMERS, transport: UNUSED });
    const groups = Array.from({ length: IO_READ_CONSUMERS + 1 }, (_, index) =>
      held(`read ${index}`, log),
    );
    const reads = groups.map((group) => pipeline.read(asked("read"), group.run));
    await settle();
    expect(log).toHaveLength(IO_READ_CONSUMERS);
    await groups[0]?.release();
    expect(log.slice(-2)).toEqual(["read 0 end", `read ${IO_READ_CONSUMERS} start`]);
    for (const group of groups.slice(1)) {
      await group.release();
    }
    await Promise.all(reads);
  });

  test("a write waits for the running reads, goes before the waiting ones, and holds new ones", async () => {
    const log: string[] = [];
    const pipeline = createPipeline({ readConsumers: 2, transport: UNUSED });
    const a = held("a", log);
    const b = held("b", log);
    const c = held("c", log);
    const d = held("d", log);
    const write = held("write", log);
    const reads = [
      pipeline.read(asked("a"), a.run),
      pipeline.read(asked("b"), b.run),
      pipeline.read(asked("c"), c.run),
    ];
    const writing = pipeline.write(asked("write"), write.run, "busy");
    await settle();
    expect(log).toEqual(["a start", "b start"]);
    await a.release();
    expect(log).toEqual(["a start", "b start", "a end"]);
    await b.release();
    expect(log.slice(-2)).toEqual(["b end", "write start"]);
    const late = pipeline.read(asked("d"), d.run);
    await settle();
    expect(log.at(-1)).toBe("write start");
    await write.release();
    expect(log.slice(-3)).toEqual(["write end", "c start", "d start"]);
    await c.release();
    await d.release();
    await Promise.all([...reads, writing, late]);
  });

  test("an exclusive group runs alone like a write, but waits instead of answering busy", async () => {
    const log: string[] = [];
    const pipeline = createPipeline({ readConsumers: 2, transport: UNUSED });
    const write = held("write", log);
    const picker = held("picker", log);
    const read = held("read", log);
    const writing = pipeline.write(asked("write"), write.run, "busy");
    await settle();
    const picking = pipeline.exclusive(asked("picker"), picker.run);
    const reading = pipeline.read(asked("read"), read.run);
    await settle();
    expect(log).toEqual(["write start"]);
    await write.release();
    expect(log).toEqual(["write start", "write end", "picker start"]);
    await picker.release();
    expect(log.slice(-2)).toEqual(["picker end", "read start"]);
    await read.release();
    expect(await Promise.all([writing, picking, reading])).toEqual(["write", "picker", "read"]);
  });

  test("groups that run alone go in the order they were asked", async () => {
    const log: string[] = [];
    const pipeline = createPipeline({ readConsumers: 2, transport: UNUSED });
    const read = held("read", log);
    const picker = held("picker", log);
    const write = held("write", log);
    const reading = pipeline.read(asked("read"), read.run);
    await settle();
    const picking = pipeline.exclusive(asked("picker"), picker.run);
    const writing = pipeline.write(asked("write"), write.run, "busy");
    await read.release();
    await picker.release();
    await write.release();
    await Promise.all([reading, picking, writing]);
    expect(log).toEqual([
      "read start",
      "read end",
      "picker start",
      "picker end",
      "write start",
      "write end",
    ]);
  });

  test("answers busy to a write asked for while another waits or runs, and runs it not", async () => {
    const log: string[] = [];
    const pipeline = createPipeline({ readConsumers: 1, transport: UNUSED });
    const read = held("read", log);
    const change = held("change", log);
    const rename = held("rename", log);
    const changeCostume = () => pipeline.write(asked("change"), change.run, "busy");
    const renameNickname = () => pipeline.write(asked("rename"), rename.run, "busy");

    const reading = pipeline.read(asked("read"), read.run);
    const first = changeCostume();
    expect(await changeCostume()).toBe("busy");
    expect(await renameNickname()).toBe("busy");
    await read.release();
    expect(await renameNickname()).toBe("busy");
    await change.release();
    expect(await Promise.all([reading, first])).toEqual(["read", "change"]);

    const next = renameNickname();
    await rename.release();
    expect(await next).toBe("rename");
    expect(log).toEqual([
      "read start",
      "read end",
      "change start",
      "change end",
      "rename start",
      "rename end",
    ]);
  });

  test("a group that rejects frees its turn for the next", async () => {
    const pipeline = createPipeline({ readConsumers: 1, transport: UNUSED });
    const fault = async () => {
      throw new Error("fault");
    };
    await expect(pipeline.write(asked("write"), fault, "busy")).rejects.toThrow("fault");
    expect(await pipeline.write(asked("write"), async () => "written", "busy")).toBe("written");
    await expect(pipeline.read(asked("read"), fault)).rejects.toThrow("fault");
    expect(await pipeline.read(asked("read"), async () => "read")).toBe("read");
    expect(await pipeline.exclusive(asked("alone"), async () => "alone")).toBe("alone");
  });
});

describe("createPipeline, stopped", () => {
  test("a running group sends no request after the one on its way", async () => {
    const hiroba = heldTransport();
    const pipeline = createPipeline({
      readConsumers: IO_READ_CONSUMERS,
      transport: hiroba.transport,
    });
    const picking = pipeline.exclusive(walking("readSongPicker"), walk(["/editor", "/handoff"]));
    await settle();

    pipeline.stop();
    await hiroba.answer();

    expect(await picking).toBe("/handoff: cancelled");
    expect(hiroba.sent).toEqual(["/editor"]);
  });

  test("a waiting group is let go at once and sends nothing", async () => {
    const hiroba = heldTransport();
    const pipeline = createPipeline({ readConsumers: 1, transport: hiroba.transport });
    const reading = pipeline.read(walking("readProfile"), walk(["/top"]));
    const writing = pipeline.write(walking("changeCostume"), walk(["/editor", "/post"]), "busy");
    await settle();

    pipeline.stop();

    expect(await writing).toBe("/editor: cancelled");
    expect(hiroba.sent).toEqual(["/top"]);
    await hiroba.answer();
    expect(await reading).toBe("done");
  });

  test("a group asked after it sends at once, beside a stopped one still ending", async () => {
    const hiroba = heldTransport();
    const pipeline = createPipeline({ readConsumers: 2, transport: hiroba.transport });
    const before = pipeline.read(walking("readProfile"), walk(["/top", "/dan"]));
    await settle();

    pipeline.stop();
    const after = pipeline.read(walking("readProfile"), walk(["/top"]));
    await settle();

    expect(hiroba.sent).toEqual(["/top", "/top"]);
    await hiroba.answer();
    expect(await before).toBe("/dan: cancelled");
    await hiroba.answer();
    expect(await after).toBe("done");
  });

  test("with no group asked, it lets the next group send at once", async () => {
    const hiroba = heldTransport();
    const pipeline = createPipeline({ readConsumers: 1, transport: hiroba.transport });

    pipeline.stop();
    const reading = pipeline.read(walking("readProfile"), walk(["/top"]));
    await hiroba.answer();

    expect(await reading).toBe("done");
  });
});

describe("createPipeline, what it tells", () => {
  function told(readConsumers = 1) {
    const hiroba = heldTransport();
    const ended: EndedGroup[] = [];
    let time = 1000;
    const pipeline = createPipeline({
      readConsumers,
      transport: hiroba.transport,
      ended: (group) => ended.push(group),
      clock: () => time,
    });
    const at = (ms: number) => {
      time = ms;
    };
    return { hiroba, ended, pipeline, at };
  }

  test("gives the running groups, then the waiting ones in the order they will start", async () => {
    const { hiroba, pipeline, at } = told();
    const reading = pipeline.read(walking("readProfile"), walk(["/mypage_top.php"]));
    const later = pipeline.read(walking("openFavorites"), walk(["/favorite_song_select.php"]));
    at(2000);
    const picking = pipeline.exclusive(
      { ...walking("readSongPicker"), expectedRequests: 10 },
      walk(["/portal_favorite_song_select.php"]),
    );
    await settle();

    expect(pipeline.now()).toEqual({
      running: [
        {
          id: 1,
          operation: "readProfile",
          kind: "read",
          askedAt: 1000,
          startedAt: 1000,
          sent: [{ method: "GET", path: "/mypage_top.php" }],
          expectedRequests: null,
        },
      ],
      waiting: [
        {
          id: 3,
          operation: "readSongPicker",
          kind: "exclusive",
          askedAt: 2000,
          startedAt: null,
          sent: [],
          expectedRequests: 10,
        },
        {
          id: 2,
          operation: "openFavorites",
          kind: "read",
          askedAt: 1000,
          startedAt: null,
          sent: [],
          expectedRequests: null,
        },
      ],
    });
    for (let answered = 0; answered < 3; answered++) {
      await hiroba.answer();
    }
    await Promise.all([reading, later, picking]);
    expect(pipeline.now()).toEqual({ running: [], waiting: [] });
  });

  test("tells what a group is for, when its asker says, while it waits, runs and when it ends", async () => {
    const { hiroba, ended, pipeline } = told();
    const reading = pipeline.read(walking("readProfile"), walk(["/mypage_top.php"]));
    const fetching = pipeline.read(
      { ...walking("picture"), subject: "myDon" },
      walk(["/imgsrc.php"]),
    );
    await settle();
    expect(pipeline.now().waiting).toEqual([
      expect.objectContaining({ operation: "picture", subject: "myDon" }),
    ]);

    await hiroba.answer();
    await settle();
    expect(pipeline.now().running).toEqual([
      expect.objectContaining({ operation: "picture", subject: "myDon" }),
    ]);
    await hiroba.answer();
    await Promise.all([reading, fetching]);
    expect(ended.map((group) => [group.operation, group.subject])).toEqual([
      ["readProfile", undefined],
      ["picture", "myDon"],
    ]);
    expect(Object.hasOwn(ended[0] ?? {}, "subject")).toBe(false);
  });

  test("tells of a group that succeeded: its operation, kind, times and requests", async () => {
    const { hiroba, ended, pipeline, at } = told();
    const reading = pipeline.read(walking("readProfile"), walk(["/mypage_top.php", "/dan.php"]));
    await settle();
    at(1500);
    await hiroba.answer();
    at(2000);
    await hiroba.answer();
    await reading;

    expect(ended).toEqual([
      {
        operation: "readProfile",
        kind: "read",
        startedAt: 1000,
        endedAt: 2000,
        requests: 2,
        outcome: "succeeded",
      },
    ]);
  });

  test("tells of a group that failed: the last request it sent, and the code its result gives", async () => {
    const { hiroba, ended, pipeline } = told();
    const failing: GroupAsked<Result<string, { readonly kind: string }>> = {
      operation: "openCostumeEditor",
      failureOf: (result) => (result.ok ? null : result.error.kind),
    };
    const opening = pipeline.read(failing, async (transport) => {
      await transport.send({ method: "GET", url: `${HIROBA}/mypage_kisekae.php?tab=1` });
      return err({ kind: "unexpectedPage" });
    });
    await hiroba.answer();
    await opening;

    expect(ended).toEqual([
      {
        operation: "openCostumeEditor",
        kind: "read",
        startedAt: 1000,
        endedAt: 1000,
        requests: 1,
        outcome: "failed",
        code: "unexpectedPage",
        at: { index: 1, request: { method: "GET", path: "/mypage_kisekae.php" } },
      },
    ]);
  });

  test("tells of a write that failed before it sent anything: no request", async () => {
    const { ended, pipeline } = told();
    const writing = pipeline.write(
      { operation: "changeCostume", failureOf: (outcome: { kind: string }) => outcome.kind },
      async () => ({ kind: "notSignedIn" }),
      { kind: "busy" },
    );
    await writing;

    expect(ended).toEqual([
      expect.objectContaining({ kind: "write", requests: 0, outcome: "failed", at: null }),
    ]);
  });

  test("tells of a group the stop ended as stopped, at the last request it sent", async () => {
    const { hiroba, ended, pipeline } = told();
    const picking = pipeline.exclusive(
      walking("readSongPicker"),
      walk(["/portal_favorite_song_select.php", "/form_data.php"]),
    );
    await settle();
    pipeline.stop();
    await hiroba.answer();
    await picking;

    expect(ended).toEqual([
      expect.objectContaining({
        operation: "readSongPicker",
        kind: "exclusive",
        requests: 1,
        outcome: "stopped",
        code: "/form_data.php: cancelled",
        at: { index: 1, request: { method: "GET", path: "/portal_favorite_song_select.php" } },
      }),
    ]);
  });

  test("tells of a group that threw as failed, and its error still reaches its asker", async () => {
    const { ended, pipeline } = told();
    const reading = pipeline.read(asked("readProfile"), async () => {
      throw new Error("fault");
    });

    await expect(reading).rejects.toThrow("fault");
    expect(ended).toEqual([
      expect.objectContaining({ requests: 0, outcome: "failed", code: "threw", at: null }),
    ]);
  });

  test("gives no query in a request it tells of", async () => {
    const { hiroba, pipeline } = told();
    const reading = pipeline.read(walking("readSongPicker"), walk(["/select_song.php?genre=3"]));
    await settle();

    expect(pipeline.now().running[0]?.sent).toEqual([{ method: "GET", path: "/select_song.php" }]);
    await hiroba.answer();
    await reading;
  });
});
