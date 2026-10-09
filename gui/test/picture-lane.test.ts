import { describe, expect, test } from "bun:test";
import { err, ok, type Result } from "@abth/core";

import { createPictureLane, type LaneTimers } from "../src/pictures/picture-lane";
import { IO_READ_CONSUMERS } from "../src/pipelines";
import type { PictureFailure, PictureView, PictureWant } from "../src/session-port";

const item = (id: number, slot: 1 | 2 | 3 | 4 | 5 = 1): PictureWant => ({
  kind: "costumeItem",
  slot,
  id,
});
const PLATE: PictureWant = { kind: "titlePlate" };
const PANEL: PictureWant = { kind: "scorePanel" };
const MEDAL: PictureWant = { kind: "medalPlate" };
const MY_DON: PictureWant = { kind: "myDon" };
const rank = (image: 2 | 3 | 4 | 5 | 6 | 7 | 8): PictureWant => ({ kind: "rankIcon", rank: image });
const crown = (name: "silver" | "gold" | "donderful"): PictureWant => ({
  kind: "crownIcon",
  crown: name,
});
const view = (id: number): PictureView => ({
  src: `data:image/png;base64,${id}`,
  width: 40,
  height: 40,
});

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

function heldPort() {
  const asked: string[] = [];
  const answers: ((result: Result<PictureView, PictureFailure>) => void)[] = [];
  const nameOf = (want: PictureWant) => {
    switch (want.kind) {
      case "costumeItem":
        return `${want.slot}/${want.id}`;
      case "rankIcon":
        return `rank/${want.rank}`;
      case "crownIcon":
        return `crown/${want.crown}`;
      default:
        return want.kind;
    }
  };
  const load = (want: PictureWant) => {
    asked.push(nameOf(want));
    return new Promise<Result<PictureView, PictureFailure>>((resolve) => answers.push(resolve));
  };
  const answer = async (result: Result<PictureView, PictureFailure>) => {
    answers.shift()?.(result);
    await Bun.sleep(0);
    await Bun.sleep(0);
  };
  return { load, asked, answer, outstanding: () => answers.length };
}

/** One at a time unless asked otherwise, so each answer shows which picture is asked next. */
function setUp(atOnce = 1) {
  const port = heldPort();
  const { timers, advance } = manualTimers();
  const lane = createPictureLane({ load: port.load, timers, dwellMs: 150, atOnce });
  return { lane, port, advance };
}

/** Asks for thumbnails 1 to `count`, the last first, each as far down the screen as its number. */
function askUpTo(lane: ReturnType<typeof createPictureLane>, count: number) {
  for (let id = count; id >= 1; id--) {
    lane.ask(item(id), { order: id });
  }
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

  test("sends as many as Hiroba's read consumers together, down the screen, the next as one comes", async () => {
    const { lane, port, advance } = setUp(IO_READ_CONSUMERS);
    askUpTo(lane, IO_READ_CONSUMERS + 1);
    await advance(150);
    expect(port.asked).toEqual(
      Array.from({ length: IO_READ_CONSUMERS }, (_, index) => `1/${index + 1}`),
    );
    await port.answer(ok(view(1)));
    expect(port.asked.at(-1)).toBe(`1/${IO_READ_CONSUMERS + 1}`);
    expect(port.outstanding()).toBe(IO_READ_CONSUMERS);
  });

  test("held, sends none, and once released sends as many as Hiroba's read consumers", async () => {
    const { lane, port, advance } = setUp(IO_READ_CONSUMERS);
    lane.hold();
    askUpTo(lane, IO_READ_CONSUMERS + 1);
    await advance(1000);
    expect(port.asked).toEqual([]);
    lane.release();
    expect(port.outstanding()).toBe(IO_READ_CONSUMERS);
  });

  test("never sends a picture again while it is on its way, though asked for again", async () => {
    const { lane, port, advance } = setUp(IO_READ_CONSUMERS);
    lane.ask(item(4), { order: 0 });
    await advance(150);
    lane.ask(item(4), { order: 1 });
    await advance(150);
    expect(port.asked).toEqual(["1/4"]);
    await port.answer(ok(view(4)));
    await advance(1000);
    expect(port.asked).toEqual(["1/4"]);
    expect(lane.peek(item(4))).toEqual({ view: view(4) });
  });

  test("asks in order down the screen for pictures whose dwells end a little apart", async () => {
    const { lane, port, advance } = setUp();
    // Each cell's observer fires a little apart, in no set order: the lowest's dwell ends first.
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

  test("asks for my page's plates in its order, the どんメダル's second, before thumbnails", async () => {
    const { lane, port, advance } = setUp();
    lane.ask(item(10), { order: 0 });
    lane.ask(MEDAL, { order: 0 });
    lane.ask(PLATE, { order: 5 });
    await advance(150);
    await port.answer(ok(view(1)));
    await port.answer(ok(view(2)));
    expect(port.asked).toEqual(["titlePlate", "medalPlate", "1/10"]);
    expect(lane.peek(MEDAL)).toEqual({ view: view(2) });
  });

  test("asks for the score panel's art after the title plate, before the どんメダル", async () => {
    const { lane, port, advance } = setUp();
    lane.ask(item(10), { order: 0 });
    lane.ask(MEDAL, { order: 0 });
    lane.ask(PANEL, { order: 3 });
    lane.ask(PLATE, { order: 5 });
    await advance(150);
    await port.answer(ok(view(1)));
    await port.answer(ok(view(2)));
    await port.answer(ok(view(3)));
    expect(port.asked).toEqual(["titlePlate", "scorePanel", "medalPlate", "1/10"]);
    expect(lane.peek(PANEL)).toEqual({ view: view(2) });
  });

  test("asks for the My Don after my page's plates, before thumbnails", async () => {
    const { lane, port, advance } = setUp();
    lane.ask(item(10), { order: 0 });
    lane.ask(MY_DON, { order: 0 });
    lane.ask(MEDAL, { order: 1 });
    lane.ask(PLATE, { order: 5 });
    await advance(150);
    await port.answer(ok(view(1)));
    await port.answer(ok(view(2)));
    await port.answer(ok(view(3)));
    expect(port.asked).toEqual(["titlePlate", "medalPlate", "myDon", "1/10"]);
    expect(lane.peek(MY_DON)).toEqual({ view: view(3) });
  });

  test("asks for the legends' icons after the My Don, ranks before crowns, before thumbnails", async () => {
    const { lane, port, advance } = setUp();
    lane.ask(item(10), { order: 0 });
    lane.ask(crown("gold"), { order: 7 });
    lane.ask(rank(6), { order: 1 });
    lane.ask(rank(5), { order: 0 });
    lane.ask(MY_DON, { order: 9 });
    await advance(150);
    for (let answered = 1; answered <= 5; answered++) {
      await port.answer(ok(view(answered)));
    }
    expect(port.asked).toEqual(["myDon", "rank/5", "rank/6", "crown/gold", "1/10"]);
  });

  test("gives each rank and crown an answer of its own", async () => {
    const { lane, port, advance } = setUp();
    lane.ask(rank(5), { order: 0 });
    lane.ask(rank(6), { order: 1 });
    lane.ask(crown("gold"), { order: 2 });
    lane.ask(crown("silver"), { order: 3 });
    await advance(150);
    for (let answered = 1; answered <= 4; answered++) {
      await port.answer(ok(view(answered)));
    }
    expect(
      [rank(5), rank(6), crown("gold"), crown("silver")].map((want) => lane.peek(want)),
    ).toEqual([1, 2, 3, 4].map((id) => ({ view: view(id) })));
    expect(lane.peek(rank(7))).toBeUndefined();
    expect(lane.peek(crown("donderful"))).toBeUndefined();
  });

  test("forgets the failures of the ranks' icons and leaves the crowns' be", async () => {
    const { lane, port, advance } = setUp();
    lane.ask(rank(5), { order: 0 });
    lane.ask(crown("gold"), { order: 1 });
    await advance(150);
    await port.answer(err({ code: "rankIcon=notPng" }));
    await port.answer(err({ code: "crownIcon=notPng" }));
    lane.forgetFailures("rankIcon");
    expect(lane.peek(rank(5))).toBeUndefined();
    expect(lane.peek(crown("gold"))).toEqual({ failure: "crownIcon=notPng" });
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

  test("renewed, asks for a picture again, and shows the one it had until the answer", async () => {
    const { lane, port, advance } = setUp();
    lane.ask(PLATE, { order: 0 });
    await advance(150);
    await port.answer(ok(view(1)));
    expect(lane.settled(PLATE)).toBe(true);
    lane.ask(PLATE, { order: 0 });
    await advance(1000);
    expect(port.asked).toEqual(["titlePlate"]);
    lane.renew("titlePlate");
    expect(lane.settled(PLATE)).toBe(false);
    expect(lane.peek(PLATE)).toEqual({ view: view(1) });
    lane.ask(PLATE, { order: 0 });
    await advance(150);
    expect(port.asked).toEqual(["titlePlate", "titlePlate"]);
    expect(lane.peek(PLATE)).toEqual({ view: view(1) });
    await port.answer(ok(view(2)));
    expect(lane.peek(PLATE)).toEqual({ view: view(2) });
    expect(lane.settled(PLATE)).toBe(true);
  });

  test("renewed, forgets a picture of the kind that did not come, and leaves other kinds be", async () => {
    const { lane, port, advance } = setUp();
    lane.ask(PLATE, { order: 0 });
    lane.ask(item(4), { order: 1 });
    await advance(150);
    await port.answer(err({ code: "titlePlate=notPng" }));
    await port.answer(ok(view(4)));
    lane.renew("titlePlate");
    expect(lane.peek(PLATE)).toBeUndefined();
    expect(lane.settled(item(4))).toBe(true);
    await advance(1000);
    expect(port.asked).toEqual(["titlePlate", "1/4"]);
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
      atOnce: 1,
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
    lane.renew("costumeItem");
    expect(calls).toBe(2);
    unsubscribe();
    lane.forget();
    expect(calls).toBe(2);
  });
});
