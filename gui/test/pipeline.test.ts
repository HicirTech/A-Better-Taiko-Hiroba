import { describe, expect, test } from "bun:test";
import { ok, type Transport } from "@abth/core";

import { createPipeline, IO_READ_CONSUMERS } from "../src/pipelines";

/** Gives whatever the pipeline has let start a turn of the event loop to begin. */
const settle = () => Bun.sleep(0);

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

/** A transport that logs each request it is sent, and answers each only when its test lets it. */
function heldTransport() {
  const sent: string[] = [];
  const answers: (() => void)[] = [];
  const transport: Transport = {
    async send(request) {
      sent.push(request.url);
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

/** A group that sends each of `urls` in turn, and gives up at the first that gets no answer. */
const walk = (transport: Transport, urls: readonly string[]) => async () => {
  for (const url of urls) {
    const sent = await transport.send({ method: "GET", url });
    if (!sent.ok) {
      return `${url}: ${sent.error.kind}`;
    }
  }
  return "done";
};

describe("createPipeline", () => {
  test("with one read consumer, runs every group one at a time in the order asked", async () => {
    const log: string[] = [];
    const pipeline = createPipeline(1);
    const first = held("first", log);
    const write = held("write", log);
    const second = held("second", log);
    const reading = pipeline.read(first.run)();
    const writing = pipeline.write(write.run, "busy")();
    await settle();
    const readingAgain = pipeline.read(second.run)();
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
    const pipeline = createPipeline(2);
    const a = held("a", log);
    const b = held("b", log);
    const c = held("c", log);
    const asked = [pipeline.read(a.run)(), pipeline.read(b.run)(), pipeline.read(c.run)()];
    await settle();
    expect(log).toEqual(["a start", "b start"]);
    await a.release();
    expect(log).toEqual(["a start", "b start", "a end", "c start"]);
    await b.release();
    await c.release();
    expect(await Promise.all(asked)).toEqual(["a", "b", "c"]);
  });

  test("Hiroba's pipeline runs its read consumers' worth of groups, and one more as one ends", async () => {
    const log: string[] = [];
    const pipeline = createPipeline(IO_READ_CONSUMERS);
    const groups = Array.from({ length: IO_READ_CONSUMERS + 1 }, (_, index) =>
      held(`read ${index}`, log),
    );
    const asked = groups.map((group) => pipeline.read(group.run)());
    await settle();
    expect(log).toHaveLength(IO_READ_CONSUMERS);
    await groups[0]?.release();
    expect(log.slice(-2)).toEqual(["read 0 end", `read ${IO_READ_CONSUMERS} start`]);
    for (const group of groups.slice(1)) {
      await group.release();
    }
    await Promise.all(asked);
  });

  test("a write waits for the running reads, goes before the waiting ones, and holds new ones", async () => {
    const log: string[] = [];
    const pipeline = createPipeline(2);
    const a = held("a", log);
    const b = held("b", log);
    const c = held("c", log);
    const d = held("d", log);
    const write = held("write", log);
    const reads = [pipeline.read(a.run)(), pipeline.read(b.run)(), pipeline.read(c.run)()];
    const writing = pipeline.write(write.run, "busy")();
    await settle();
    expect(log).toEqual(["a start", "b start"]);
    await a.release();
    expect(log).toEqual(["a start", "b start", "a end"]);
    await b.release();
    expect(log.slice(-2)).toEqual(["b end", "write start"]);
    const late = pipeline.read(d.run)();
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
    const pipeline = createPipeline(2);
    const write = held("write", log);
    const picker = held("picker", log);
    const read = held("read", log);
    const writing = pipeline.write(write.run, "busy")();
    await settle();
    const picking = pipeline.exclusive(picker.run)();
    const reading = pipeline.read(read.run)();
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
    const pipeline = createPipeline(2);
    const read = held("read", log);
    const picker = held("picker", log);
    const write = held("write", log);
    const reading = pipeline.read(read.run)();
    await settle();
    const picking = pipeline.exclusive(picker.run)();
    const writing = pipeline.write(write.run, "busy")();
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
    const pipeline = createPipeline(1);
    const read = held("read", log);
    const change = held("change", log);
    const rename = held("rename", log);
    const changeCostume = pipeline.write(change.run, "busy");
    const renameNickname = pipeline.write(rename.run, "busy");

    const reading = pipeline.read(read.run)();
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
    const pipeline = createPipeline(1);
    const failingWrite = pipeline.write(async () => {
      throw new Error("fault");
    }, "busy");
    await expect(failingWrite()).rejects.toThrow("fault");
    expect(await pipeline.write(async () => "written", "busy")()).toBe("written");
    await expect(
      pipeline.read(async () => {
        throw new Error("lost");
      })(),
    ).rejects.toThrow("lost");
    expect(await pipeline.read(async () => "read")()).toBe("read");
    expect(await pipeline.exclusive(async () => "alone")()).toBe("alone");
  });

  test("stopped, a running group sends no request after the one on its way", async () => {
    const pipeline = createPipeline(IO_READ_CONSUMERS);
    const hiroba = heldTransport();
    const gated = pipeline.gate(hiroba.transport);
    const picking = pipeline.exclusive(walk(gated, ["/editor", "/handoff"]))();
    await settle();

    pipeline.stop();
    await hiroba.answer();

    expect(await picking).toBe("/handoff: cancelled");
    expect(hiroba.sent).toEqual(["/editor"]);
  });

  test("stopped, a waiting group sends nothing, and one asked after waits for both to end", async () => {
    const pipeline = createPipeline(1);
    const hiroba = heldTransport();
    const gated = pipeline.gate(hiroba.transport);
    const reading = pipeline.read(walk(gated, ["/top", "/dan"]))();
    const writing = pipeline.write(walk(gated, ["/editor", "/post"]), "busy")();
    await settle();

    pipeline.stop();
    const next = pipeline.read(walk(gated, ["/top"]))();

    expect(await writing).toBe("/editor: cancelled");
    await settle();
    expect(hiroba.sent).toEqual(["/top"]);
    await hiroba.answer();
    expect(await reading).toBe("/dan: cancelled");
    await hiroba.answer();
    expect(await next).toBe("done");
    expect(hiroba.sent).toEqual(["/top", "/top"]);
  });

  test("stopped twice, a group asked between the stops ends too before a later one starts", async () => {
    const pipeline = createPipeline(2);
    const hiroba = heldTransport();
    const gated = pipeline.gate(hiroba.transport);
    const first = pipeline.read(walk(gated, ["/a", "/a2"]))();
    await settle();

    pipeline.stop();
    const between = pipeline.read(walk(gated, ["/b"]))();
    pipeline.stop();
    const after = pipeline.read(walk(gated, ["/c"]))();

    expect(await between).toBe("/b: cancelled");
    await hiroba.answer();
    expect(await first).toBe("/a2: cancelled");
    await hiroba.answer();
    expect(await after).toBe("done");
    expect(hiroba.sent).toEqual(["/a", "/c"]);
  });

  test("a stop with no group asked lets the next group send at once", async () => {
    const pipeline = createPipeline(1);
    const hiroba = heldTransport();

    pipeline.stop();
    const reading = pipeline.read(walk(pipeline.gate(hiroba.transport), ["/top"]))();
    await hiroba.answer();

    expect(await reading).toBe("done");
  });
});
