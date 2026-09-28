/**
 * The queue in front of Hiroba, which both shells use: verbs one at a time, and a write asked for
 * while another is queued or running answered busy rather than queued.
 */
import { describe, expect, test } from "bun:test";

import { createHirobaQueue } from "../src/hiroba-session";

/** A verb that logs when it starts and ends, and ends only when its test lets it. */
function held(name: string, log: string[]) {
  const releases: (() => void)[] = [];
  const run = async () => {
    log.push(`${name} start`);
    await new Promise<void>((resolve) => releases.push(resolve));
    log.push(`${name} end`);
    return name;
  };
  const release = async () => {
    // Lets queued turns reach the verb before it is let go.
    await Bun.sleep(0);
    releases.shift()?.();
  };
  return { run, release };
}

describe("createHirobaQueue", () => {
  test("runs every verb one at a time, in the order asked", async () => {
    const log: string[] = [];
    const queue = createHirobaQueue();
    const read = held("read", log);
    const write = held("write", log);
    const reading = queue.oneAtATime(read.run)();
    const writing = queue.oneWriteAtATime(write.run, "busy")();
    const readingAgain = queue.oneAtATime(read.run)();
    await read.release();
    await write.release();
    await read.release();
    expect(await Promise.all([reading, writing, readingAgain])).toEqual(["read", "write", "read"]);
    expect(log).toEqual([
      "read start",
      "read end",
      "write start",
      "write end",
      "read start",
      "read end",
    ]);
  });

  test("answers busy to a write asked for while another is queued or running, and runs it not", async () => {
    const log: string[] = [];
    const queue = createHirobaQueue();
    const read = held("read", log);
    const change = held("change", log);
    const undo = held("undo", log);
    const changeCostume = queue.oneWriteAtATime(change.run, "busy");
    const undoCostume = queue.oneWriteAtATime(undo.run, "busy");

    const reading = queue.oneAtATime(read.run)();
    // Queued behind the read, not yet running: a second press, and the other write, are busy.
    const first = changeCostume();
    expect(await changeCostume()).toBe("busy");
    expect(await undoCostume()).toBe("busy");
    await read.release();
    // Running now: still busy.
    await Bun.sleep(0);
    expect(await undoCostume()).toBe("busy");
    await change.release();
    expect(await Promise.all([reading, first])).toEqual(["read", "change"]);

    // Once it has ended, a write runs again.
    const next = undoCostume();
    await undo.release();
    expect(await next).toBe("undo");
    expect(log).toEqual([
      "read start",
      "read end",
      "change start",
      "change end",
      "undo start",
      "undo end",
    ]);
  });

  test("a write that rejects frees the queue and the next write", async () => {
    const queue = createHirobaQueue();
    const failing = queue.oneWriteAtATime(async () => {
      throw new Error("fault");
    }, "busy");
    await expect(failing()).rejects.toThrow("fault");
    expect(await queue.oneWriteAtATime(async () => "written", "busy")()).toBe("written");
    expect(await queue.oneAtATime(async () => "read")()).toBe("read");
  });
});
