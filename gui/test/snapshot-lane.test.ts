import { expect, mock, test } from "bun:test";

import type { PictureLane } from "../src/pictures/picture-lane";
import type { PictureWant } from "../src/shared/session-port";
import { snapshotLane } from "../src/snapshots/snapshot-lane";

const PLATE: PictureWant = { kind: "titlePlate" };
const MY_DON: PictureWant = { kind: "myDon" };
const LONG_MS = 60_000;

/** A lane whose pictures come when the test says, telling its listeners as a lane does. */
function handLane() {
  const came = new Set<string>();
  const listeners = new Set<() => void>();
  const asked: PictureWant[] = [];
  const lane: PictureLane = {
    peek: () => undefined,
    settled: (want) => came.has(want.kind),
    ask: (want) => {
      asked.push(want);
      return () => undefined;
    },
    hold: () => undefined,
    release: () => undefined,
    forgetFailures: () => undefined,
    renew: () => undefined,
    readAgain: () => undefined,
    readAgainEnded: () => null,
    forget: () => undefined,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    version: () => came.size,
  };
  const comes = (want: PictureWant) => {
    came.add(want.kind);
    for (const listener of [...listeners]) {
      listener();
    }
  };
  return { lane, asked, comes, listening: () => listeners.size };
}

/** Whether `promise` has settled, once the jobs queued now have run. */
async function settledYet(promise: Promise<void>): Promise<boolean> {
  let settled = false;
  void promise.then(() => {
    settled = true;
  });
  await Promise.resolve();
  return settled;
}

test("a snapshot's lane is drawn off the window and asks the lane it wraps", () => {
  const hand = handLane();
  const { lane } = snapshotLane(hand.lane);

  lane.ask(PLATE, { order: 0 });

  expect(lane.offTheWindow).toBe(true);
  expect(hand.lane.offTheWindow).toBeUndefined();
  expect(hand.asked).toEqual([PLATE]);
});

test("every other call goes to the lane it wraps, its answer back", () => {
  const wrapped = {
    peek: mock(() => undefined),
    settled: mock(() => true),
    ask: mock(() => () => undefined),
    hold: mock(() => undefined),
    release: mock(() => undefined),
    forgetFailures: mock(() => undefined),
    renew: mock(() => undefined),
    readAgain: mock(() => undefined),
    readAgainEnded: mock(() => ({ failed: true })),
    forget: mock(() => undefined),
    subscribe: mock(() => () => undefined),
    version: mock(() => 7),
  } satisfies PictureLane;
  const { lane } = snapshotLane(wrapped);

  expect(lane.settled(PLATE)).toBe(true);
  expect(lane.readAgainEnded()).toEqual({ failed: true });
  expect(lane.version()).toBe(7);
  lane.peek(PLATE);
  lane.hold();
  lane.release();
  lane.forgetFailures();
  lane.renew("myDon");
  lane.readAgain(["myDon"]);
  lane.forget();
  lane.subscribe(() => undefined);

  for (const [name, call] of Object.entries(wrapped)) {
    expect([name, call.mock.calls.length]).toEqual([name, name === "ask" ? 0 : 1]);
  }
});

test("its pictures have all come once every one asked has its answer", async () => {
  const hand = handLane();
  const { lane, allCome } = snapshotLane(hand.lane);
  lane.ask(PLATE, { order: 0 });
  lane.ask(MY_DON, { order: 1 });
  const all = allCome(LONG_MS);

  hand.comes(PLATE);
  expect(await settledYet(all)).toBe(false);
  hand.comes(MY_DON);

  expect(await settledYet(all)).toBe(true);
  expect(hand.listening()).toBe(0);
});

test("pictures that came before the wait, or none asked, have all come at once", async () => {
  const hand = handLane();
  const { lane, allCome } = snapshotLane(hand.lane);
  expect(await settledYet(allCome(LONG_MS))).toBe(true);

  lane.ask(PLATE, { order: 0 });
  hand.comes(PLATE);

  expect(await settledYet(allCome(LONG_MS))).toBe(true);
  expect(hand.listening()).toBe(0);
});

test("the wait ends after its time with whatever came", async () => {
  const hand = handLane();
  const { lane, allCome } = snapshotLane(hand.lane);
  lane.ask(PLATE, { order: 0 });

  await allCome(1);

  expect(hand.listening()).toBe(0);
});
