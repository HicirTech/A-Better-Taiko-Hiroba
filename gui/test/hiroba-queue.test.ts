import { describe, expect, test } from "bun:test";

import { createHirobaQueue, whenQueueQuiet } from "../src/hiroba-session";

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
    const rename = held("rename", log);
    const changeCostume = queue.oneWriteAtATime(change.run, "busy");
    const renameNickname = queue.oneWriteAtATime(rename.run, "busy");

    const reading = queue.oneAtATime(read.run)();
    const first = changeCostume();
    expect(await changeCostume()).toBe("busy");
    expect(await renameNickname()).toBe("busy");
    await read.release();
    await Bun.sleep(0);
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

  test("a write that rejects frees the queue and the next write", async () => {
    const queue = createHirobaQueue();
    const failing = queue.oneWriteAtATime(async () => {
      throw new Error("fault");
    }, "busy");
    await expect(failing()).rejects.toThrow("fault");
    expect(await queue.oneWriteAtATime(async () => "written", "busy")()).toBe("written");
    expect(await queue.oneAtATime(async () => "read")()).toBe("read");
  });

  test("lets a quiet wait go only once nothing has run or waited for that long", async () => {
    const log: string[] = [];
    const queue = createHirobaQueue();
    const read = held("read", log);
    const reading = queue.oneAtATime(read.run)();
    let quiet = false;
    const waiting = queue.whenQuiet(40).then(() => {
      quiet = true;
    });
    await read.release();
    await reading;
    const ended = Date.now();
    await Bun.sleep(10);
    expect(quiet).toBe(false);
    await waiting;
    expect(Date.now() - ended).toBeGreaterThanOrEqual(35);
  });

  test("goes at once when the queue has long been quiet", async () => {
    const queue = createHirobaQueue();
    const started = Date.now();
    await queue.whenQuiet(1000);
    expect(Date.now() - started).toBeLessThan(100);
  });
});

describe("whenQueueQuiet", () => {
  test("lets a read asked while it waits go first, then goes itself", async () => {
    const log: string[] = [];
    const queue = createHirobaQueue();
    const first = held("first", log);
    const page = held("page", log);
    const reading = queue.oneAtATime(first.run)();
    const picker = whenQueueQuiet(queue, async () => {
      log.push("picker");
      return "picker";
    })();
    await first.release();
    const asked = queue.oneAtATime(page.run)();
    await page.release();
    expect(await Promise.all([reading, asked, picker])).toEqual(["first", "page", "picker"]);
    expect(log).toEqual(["first start", "first end", "page start", "page end", "picker"]);
  });
});
