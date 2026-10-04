import { describe, expect, test } from "bun:test";

import { gesturesHeld, holdGestures } from "../src/navigation/gesture-hold";

describe("holdGestures", () => {
  test("holds until every hold is let go, and letting go twice counts once", () => {
    expect(gesturesHeld()).toBe(false);
    const first = holdGestures();
    const second = holdGestures();
    first();
    first();
    expect(gesturesHeld()).toBe(true);
    second();
    expect(gesturesHeld()).toBe(false);
  });
});
