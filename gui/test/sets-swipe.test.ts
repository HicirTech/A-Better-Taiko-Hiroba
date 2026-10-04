import { describe, expect, test } from "bun:test";

import { type SetsSwipeContext, setsSwipeStarted } from "../src/favorites/sets-swipe";
import {
  OPENING_AREA_SHARE,
  SWIPE_DISTANCE_PX,
  swipeReached,
} from "../src/navigation/swipe-gesture";
import type { TouchPoint } from "../src/read-again/pull-gesture";

const WINDOW_WIDTH_PX = 360;
const OPENING_LIMIT_PX = WINDOW_WIDTH_PX - WINDOW_WIDTH_PX * OPENING_AREA_SHARE;
const START = { x: 260, y: 400 };

const landed = (at: TouchPoint = START, overrides: Partial<SetsSwipeContext> = {}) =>
  setsSwipeStarted(at, {
    fingers: 1,
    drawerOpen: false,
    windowWidthPx: WINDOW_WIDTH_PX,
    claimed: false,
    ...overrides,
  });

describe("setsSwipeStarted", () => {
  test("lets one finger in the right two thirds begin the swipe that opens the drawer", () => {
    expect(landed()).toEqual({ start: START, direction: "left" });
  });

  test.each([OPENING_LIMIT_PX, WINDOW_WIDTH_PX])("begins that swipe at x = %p", (x) => {
    expect(landed({ x, y: START.y })).toEqual({ start: { x, y: START.y }, direction: "left" });
  });

  type RefusedCase = [label: string, at: TouchPoint, context: Partial<SetsSwipeContext>];
  test.each<RefusedCase>([
    ["a touch left of the two thirds", { x: OPENING_LIMIT_PX - 1, y: START.y }, {}],
    ["two fingers", START, { fingers: 2 }],
    ["a touch that the menu, a dialog or a text field has", START, { claimed: true }],
  ])("never begins a swipe that opens the drawer for %s", (_label, at, context) => {
    expect(landed(at, context)).toBeNull();
  });

  test("lets one finger anywhere begin the swipe that closes the open drawer", () => {
    const farLeft = { x: 1, y: START.y };
    expect(landed(farLeft, { drawerOpen: true })).toEqual({ start: farLeft, direction: "right" });
    expect(landed(START, { drawerOpen: true })).toEqual({ start: START, direction: "right" });
  });

  test("leaves the swipe that closes the drawer to the drawer, though the drawer claims the touch", () => {
    expect(landed(START, { drawerOpen: true, claimed: true })).toEqual({
      start: START,
      direction: "right",
    });
  });

  test("never begins the swipe that closes the drawer for two fingers", () => {
    expect(landed(START, { drawerOpen: true, fingers: 2 })).toBeNull();
  });
});

describe("a swipe the drawer began", () => {
  const finger = (along: number) => ({ x: START.x + along, y: START.y });

  test("is reached by a finger that goes far enough to the left to open it", () => {
    const opening = landed();
    expect(opening !== null && swipeReached(opening, finger(-SWIPE_DISTANCE_PX))).toBe(true);
    expect(opening !== null && swipeReached(opening, finger(SWIPE_DISTANCE_PX))).toBe(false);
  });

  test("is reached by a finger that goes far enough to the right to close it", () => {
    const closing = landed(START, { drawerOpen: true });
    expect(closing !== null && swipeReached(closing, finger(SWIPE_DISTANCE_PX))).toBe(true);
    expect(closing !== null && swipeReached(closing, finger(-SWIPE_DISTANCE_PX))).toBe(false);
  });
});
