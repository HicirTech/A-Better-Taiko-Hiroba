/**
 * The click a lift may make after a long-press that took the window to another page: stopped in
 * the window, against a bare EventTarget for it and timers the test runs by hand.
 */
import { describe, expect, test } from "bun:test";

import {
  CLICK_AFTER_LIFT_MS,
  SWALLOW_MAX_MS,
  type SwallowTimers,
  swallowTouchClick,
} from "../src/my-page/swallow-touch-click";

/** A pointer event as the browser makes one: of a kind, from a kind of pointer. */
const pointerEvent = (type: string, pointerType: string) =>
  Object.assign(new Event(type, { cancelable: true }), { pointerType });

/** A window with timers the test runs by hand. */
function harness() {
  const target = new EventTarget();
  const pending = new Map<number, { readonly run: () => void; readonly at: number }>();
  let now = 0;
  let nextTimer = 1;
  const timers: SwallowTimers = {
    set(run, ms) {
      const id = nextTimer++;
      pending.set(id, { run, at: now + ms });
      return id;
    },
    clear(timer) {
      pending.delete(timer as number);
    },
  };
  /** Lets `ms` pass, running each timer that comes due. */
  const pass = (ms: number) => {
    now += ms;
    for (const [id, timer] of [...pending]) {
      if (timer.at <= now) {
        pending.delete(id);
        timer.run();
      }
    }
  };
  /** Sends a click from a kind of pointer to the window, and says whether it was stopped there. */
  const clickBy = (pointerType: string) => {
    let propagationStops = 0;
    const click = Object.assign(pointerEvent("click", pointerType), {
      stopPropagation: () => {
        propagationStops += 1;
      },
    });
    target.dispatchEvent(click);
    return click.defaultPrevented && propagationStops === 1;
  };
  const send = (type: string) => target.dispatchEvent(pointerEvent(type, "touch"));
  return { target, timers, pass, clickBy, send, pending: () => pending.size };
}

describe("swallowTouchClick", () => {
  test("stops the click a finger makes of the lift", () => {
    const { target, timers, clickBy } = harness();
    swallowTouchClick(target, timers);

    expect(clickBy("touch")).toBe(true);
  });

  test("stops that one click only", () => {
    const { target, timers, clickBy } = harness();
    swallowTouchClick(target, timers);

    expect(clickBy("touch")).toBe(true);
    expect(clickBy("touch")).toBe(false);
  });

  test.each([
    ["a mouse", "mouse"],
    ["a key", ""],
  ])("lets a click by %s through, and goes on waiting for the finger's", (_label, pointer) => {
    const { target, timers, clickBy } = harness();
    swallowTouchClick(target, timers);

    expect(clickBy(pointer)).toBe(false);
    expect(clickBy("touch")).toBe(true);
  });

  test("ends when another touch begins, whose click is its own", () => {
    const { target, timers, clickBy, send } = harness();
    swallowTouchClick(target, timers);

    send("pointerdown");

    expect(clickBy("touch")).toBe(false);
  });

  test("still stops the click for a moment after the finger lifts", () => {
    const { target, timers, pass, clickBy, send } = harness();
    swallowTouchClick(target, timers);

    send("pointerup");
    pass(CLICK_AFTER_LIFT_MS - 1);

    expect(clickBy("touch")).toBe(true);
  });

  test.each([["pointerup"], ["pointercancel"]])(
    "ends once the finger has lifted (%s) and no click has come",
    (lift) => {
      const { target, timers, pass, clickBy, send } = harness();
      swallowTouchClick(target, timers);

      send(lift);
      pass(CLICK_AFTER_LIFT_MS);

      expect(clickBy("touch")).toBe(false);
    },
  );

  test("waits however long the finger stays down, up to a limit", () => {
    const within = harness();
    swallowTouchClick(within.target, within.timers);
    within.pass(SWALLOW_MAX_MS - 1);

    const beyond = harness();
    swallowTouchClick(beyond.target, beyond.timers);
    beyond.pass(SWALLOW_MAX_MS);

    expect(within.clickBy("touch")).toBe(true);
    expect(beyond.clickBy("touch")).toBe(false);
  });

  test("can be ended at once, leaving no timer behind", () => {
    const { target, timers, clickBy, pending } = harness();
    const end = swallowTouchClick(target, timers);

    end();

    expect(clickBy("touch")).toBe(false);
    expect(pending()).toBe(0);
  });

  test("leaves no timer behind once it has stopped a click", () => {
    const { target, timers, clickBy, pending } = harness();
    swallowTouchClick(target, timers);
    clickBy("touch");

    expect(pending()).toBe(0);
  });
});
