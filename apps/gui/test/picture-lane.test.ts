/**
 * The window's lane for Hiroba's pictures, against a stand-in port and timers the test moves on by
 * hand: one picture at a time, only after the dwell, in order, and never while held.
 */
import { describe, expect, test } from "bun:test";
import { err, ok, type Result } from "@abth/core";

import { createPictureLane, type LaneTimers } from "../src/pictures/picture-lane";
import type { PictureFailure, PictureView, PictureWant } from "../src/session-port";

const item = (id: number, slot: 1 | 2 | 3 | 4 | 5 = 1): PictureWant => ({
  kind: "costumeItem",
  slot,
  id,
});
const PLATE: PictureWant = { kind: "titlePlate" };
const view = (id: number): PictureView => ({
  src: `data:image/png;base64,${id}`,
  width: 40,
  height: 40,
});

/** Timers that fire only when the test moves the clock on. */
function manualTimers() {
  let now = 0;
  const pending = new Map<number, { at: number; run: () => void }>();
  let next = 1;
  const timers: LaneTimers = {
    set: (run, ms) => {
      const id = next++;
      pending.set(id, { at: now + ms, run });
      return id;
    },
    clear: (timer) => {
      pending.delete(timer as number);
    },
    now: () => now,
  };
  /** Moves the clock on by `ms`, firing every timer due by then, those they set included. */
  const advance = async (ms: number) => {
    now += ms;
    for (;;) {
      const due = [...pending]
        .filter(([, timer]) => timer.at <= now)
        .sort(([, a], [, b]) => a.at - b.at);
      const [first] = due;
      if (first === undefined) {
        break;
      }
      pending.delete(first[0]);
      first[1].run();
    }
    await Bun.sleep(0);
  };
  return { timers, advance };
}

/** A stand-in port whose every answer waits until the test lets it go. */
function heldPort() {
  const asked: string[] = [];
  const answers: ((result: Result<PictureView, PictureFailure>) => void)[] = [];
  const load = (want: PictureWant) => {
    asked.push(want.kind === "costumeItem" ? `${want.slot}/${want.id}` : want.kind);
    return new Promise<Result<PictureView, PictureFailure>>((resolve) => answers.push(resolve));
  };
  /** Lets the oldest request go with `result`, then lets the lane move on. */
  const answer = async (result: Result<PictureView, PictureFailure>) => {
    answers.shift()?.(result);
    await Bun.sleep(0);
    await Bun.sleep(0);
  };
  return { load, asked, answer, outstanding: () => answers.length };
}

function setUp() {
  const port = heldPort();
  const { timers, advance } = manualTimers();
  const lane = createPictureLane({ load: port.load, timers, dwellMs: 150 });
  return { lane, port, advance };
}

describe("createPictureLane", () => {
  test("asks for one picture at a time, in order down the screen", async () => {
    const { lane, port, advance } = setUp();
    lane.ask(item(30), { order: 3 });
    lane.ask(item(10), { order: 1 });
    lane.ask(item(20), { order: 2 });
    await advance(150);
    expect(port.asked).toEqual(["1/10"]);
    expect(port.outstanding()).toBe(1);
    await port.answer(ok(view(10)));
    expect(port.asked).toEqual(["1/10", "1/20"]);
    await port.answer(ok(view(20)));
    await port.answer(ok(view(30)));
    expect(port.asked).toEqual(["1/10", "1/20", "1/30"]);
    expect(lane.peek(item(30))).toEqual({ view: view(30) });
  });

  test("asks in order down the screen for pictures whose dwells end a little apart", async () => {
    const { lane, port, advance } = setUp();
    // Each cell hears from its own observer, a little apart and in no set order: the lowest's
    // dwell ends first, a millisecond before the others'.
    lane.ask(item(30), { order: 3 });
    await advance(1);
    lane.ask(item(10), { order: 1 });
    await advance(1);
    lane.ask(item(20), { order: 2 });
    await advance(148);
    expect(port.asked).toEqual(["1/10"]);
    await port.answer(ok(view(10)));
    expect(port.asked).toEqual(["1/10", "1/20"]);
    await port.answer(ok(view(20)));
    expect(port.asked).toEqual(["1/10", "1/20", "1/30"]);
  });

  test("sends no picture more than a frame before its own dwell ends", async () => {
    const { lane, port, advance } = setUp();
    lane.ask(item(30), { order: 3 });
    await advance(100);
    lane.ask(item(10), { order: 1 });
    await advance(50);
    expect(port.asked).toEqual(["1/30"]);
    await port.answer(ok(view(30)));
    expect(port.asked).toEqual(["1/30"]);
    await advance(100);
    expect(port.asked).toEqual(["1/30", "1/10"]);
  });

  test("asks for the identity card's plate before thumbnails, whatever their order", async () => {
    const { lane, port, advance } = setUp();
    lane.ask(item(10), { order: 0 });
    lane.ask(item(20), { order: 1 });
    lane.ask(PLATE, { order: 5 });
    await advance(150);
    expect(port.asked).toEqual(["titlePlate"]);
    await port.answer(ok(view(1)));
    expect(lane.peek({ kind: "titlePlate" })).toEqual({ view: view(1) });
    expect(port.asked).toEqual(["titlePlate", "1/10"]);
  });

  test("forgets the failures of one kind only, a kind with no numbers among them", async () => {
    const { lane, port, advance } = setUp();
    lane.ask(PLATE, { order: 0 });
    lane.ask(item(4), { order: 1 });
    await advance(150);
    await port.answer(err({ code: "titlePlate=notPng" }));
    await port.answer(err({ code: "costumeItem=notPng" }));
    lane.forgetFailures("titlePlate");
    expect(lane.peek(PLATE)).toBeUndefined();
    expect(lane.peek(item(4))).toEqual({ failure: "costumeItem=notPng" });
  });

  test("asks nothing for a picture that leaves the screen before the dwell", async () => {
    const { lane, port, advance } = setUp();
    const takeBack = lane.ask(item(4), { order: 0 });
    await advance(149);
    expect(port.asked).toEqual([]);
    takeBack();
    await advance(1000);
    expect(port.asked).toEqual([]);
  });

  test("asks nothing for a picture taken back while it waited its turn", async () => {
    const { lane, port, advance } = setUp();
    lane.ask(item(4), { order: 0 });
    const takeBack = lane.ask(item(14), { order: 1 });
    await advance(150);
    takeBack();
    await port.answer(ok(view(4)));
    expect(port.asked).toEqual(["1/4"]);
    expect(port.outstanding()).toBe(0);
  });

  test("keeps a picture that came after it was taken back, and asks for it no more", async () => {
    const { lane, port, advance } = setUp();
    const takeBack = lane.ask(item(4), { order: 0 });
    await advance(150);
    takeBack();
    await port.answer(ok(view(4)));
    expect(lane.peek(item(4))).toEqual({ view: view(4) });
    lane.ask(item(4), { order: 0 });
    await advance(1000);
    expect(port.asked).toEqual(["1/4"]);
  });

  test("shares one request between two askers for the same picture", async () => {
    const { lane, port, advance } = setUp();
    lane.ask(item(4), { order: 0 });
    lane.ask(item(4), { order: 5 });
    await advance(150);
    await port.answer(ok(view(4)));
    await advance(1000);
    expect(port.asked).toEqual(["1/4"]);
  });

  test("sends nothing while held, and goes on where it left off once released", async () => {
    const { lane, port, advance } = setUp();
    lane.hold();
    lane.ask(item(4), { order: 0 });
    lane.ask(item(14), { order: 1 });
    await advance(1000);
    expect(port.asked).toEqual([]);
    lane.release();
    expect(port.asked).toEqual(["1/4"]);
    // A hold that comes with a picture on its way lets it land, then sends nothing more.
    lane.hold();
    await port.answer(ok(view(4)));
    expect(port.asked).toEqual(["1/4"]);
    lane.release();
    expect(port.asked).toEqual(["1/4", "1/14"]);
  });

  test("remembers a picture that did not come, until its failures are forgotten", async () => {
    const { lane, port, advance } = setUp();
    const code = "costumeItem=notPng status=200 type=image/gif bytes=43";
    lane.ask(item(4), { order: 0 });
    await advance(150);
    await port.answer(err({ code }));
    expect(lane.peek(item(4))).toEqual({ failure: code });
    lane.ask(item(4), { order: 0 });
    await advance(1000);
    expect(port.asked).toEqual(["1/4"]);
    lane.forgetFailures("costumeItem");
    expect(lane.peek(item(4))).toBeUndefined();
    lane.ask(item(4), { order: 0 });
    await advance(150);
    expect(port.asked).toEqual(["1/4", "1/4"]);
  });

  test("a call that throws is a failure with a code, and the lane goes on", async () => {
    const { timers, advance } = manualTimers();
    let calls = 0;
    const lane = createPictureLane({
      load: async () => {
        calls += 1;
        if (calls === 1) {
          throw new Error("Refused abth:read-picture: arguments it does not take");
        }
        return ok(view(14));
      },
      timers,
    });
    lane.ask(item(4), { order: 0 });
    lane.ask(item(14), { order: 1 });
    await advance(150);
    await Bun.sleep(0);
    expect(lane.peek(item(4))).toEqual({ failure: "costumeItem=callFailed" });
    expect(lane.peek(item(14))).toEqual({ view: view(14) });
  });

  test("forgotten, it keeps nothing, sends nothing asked for before, and drops what lands", async () => {
    const { lane, port, advance } = setUp();
    lane.ask(item(4), { order: 0 });
    lane.ask(item(14), { order: 1 });
    await advance(150);
    lane.forget();
    await port.answer(ok(view(4)));
    await advance(1000);
    expect(port.asked).toEqual(["1/4"]);
    expect(lane.peek(item(4))).toBeUndefined();
    // Still one at a time: a picture asked for after it goes once the one on its way has landed.
    lane.ask(item(36), { order: 0 });
    await advance(150);
    expect(port.asked).toEqual(["1/4", "1/36"]);
  });

  test("tells its subscribers whenever what it has changes", async () => {
    const { lane, port, advance } = setUp();
    let calls = 0;
    const unsubscribe = lane.subscribe(() => {
      calls += 1;
    });
    const before = lane.version();
    lane.ask(item(4), { order: 0 });
    await advance(150);
    await port.answer(ok(view(4)));
    expect(calls).toBe(1);
    expect(lane.version()).not.toBe(before);
    unsubscribe();
    lane.forget();
    expect(calls).toBe(1);
  });
});
