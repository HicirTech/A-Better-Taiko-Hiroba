import { describe, expect, test } from "bun:test";

import {
  OPENING_AREA_SHARE,
  SWIPE_DISTANCE_PX,
  SWIPE_STRAIGHTNESS,
  type Swipe,
  type SwipeContext,
  type SwipeDirection,
  swipeReached,
  swipeStarted,
} from "../src/navigation/swipe-gesture";
import type { TouchPoint } from "../src/read-again/pull-gesture";

const WINDOW_WIDTH_PX = 360;
const OPENING_LIMIT_PX = WINDOW_WIDTH_PX * OPENING_AREA_SHARE;
const START = { x: 100, y: 400 };

const landed = (at: TouchPoint = START, overrides: Partial<SwipeContext> = {}) =>
  swipeStarted(at, {
    fingers: 1,
    menuOpen: false,
    windowWidthPx: WINDOW_WIDTH_PX,
    claimed: false,
    ...overrides,
  });

describe("swipeStarted", () => {
  test("lets one finger in the left two thirds begin the swipe that opens the menu", () => {
    expect(landed()).toEqual({ start: START, direction: "right" });
  });

  test.each([0, OPENING_LIMIT_PX])("begins that swipe at x = %p", (x) => {
    expect(landed({ x, y: START.y })).toEqual({ start: { x, y: START.y }, direction: "right" });
  });

  type RefusedCase = [label: string, at: TouchPoint, context: Partial<SwipeContext>];
  test.each<RefusedCase>([
    ["a touch right of the two thirds", { x: OPENING_LIMIT_PX + 1, y: START.y }, {}],
    ["two fingers", START, { fingers: 2 }],
    ["a touch that a text field or a dialog has", START, { claimed: true }],
  ])("never begins a swipe that opens the menu for %s", (_label, at, context) => {
    expect(landed(at, context)).toBeNull();
  });

  test("lets one finger anywhere begin the swipe that closes the open menu", () => {
    const farRight = { x: WINDOW_WIDTH_PX - 1, y: START.y };
    expect(landed(farRight, { menuOpen: true })).toEqual({ start: farRight, direction: "left" });
    expect(landed(START, { menuOpen: true })).toEqual({ start: START, direction: "left" });
  });

  test("never begins the swipe that closes the menu for two fingers", () => {
    expect(landed(START, { menuOpen: true, fingers: 2 })).toBeNull();
  });
});

describe.each<[direction: SwipeDirection, sign: 1 | -1]>([
  ["right", 1],
  ["left", -1],
])("swipeReached for a swipe %s", (direction, sign) => {
  const swipe: Swipe = { start: START, direction };
  const flattest = SWIPE_DISTANCE_PX / SWIPE_STRAIGHTNESS;
  // `along` is the travel the swipe's way, `across` the vertical drift.
  const finger = (along: number, across: number) => ({
    x: START.x + sign * along,
    y: START.y + across,
  });

  type TravelCase = [label: string, along: number, across: number];
  test.each<TravelCase>([
    ["the whole distance straight", SWIPE_DISTANCE_PX, 0],
    ["a long way straight", 4 * SWIPE_DISTANCE_PX, 0],
    ["the distance, rising by half of it", SWIPE_DISTANCE_PX, -flattest],
    ["the distance, falling by half of it", SWIPE_DISTANCE_PX, flattest],
  ])("is reached by a finger that goes %s", (_label, along, across) => {
    expect(swipeReached(swipe, finger(along, across))).toBe(true);
  });

  test.each<TravelCase>([
    ["a pixel short of the distance", SWIPE_DISTANCE_PX - 1, 0],
    ["the distance, a pixel steeper than half of it", SWIPE_DISTANCE_PX, flattest + 1],
    ["a long way, steeper than half of it", 4 * SWIPE_DISTANCE_PX, 2 * SWIPE_DISTANCE_PX + 1],
    ["a scroll that drifts a little sideways", 20, 300],
    ["the other way", -SWIPE_DISTANCE_PX, 0],
  ])("is not reached by a finger that goes %s", (_label, along, across) => {
    expect(swipeReached(swipe, finger(along, across))).toBe(false);
  });

  test("is not reached by a finger that has not moved", () => {
    expect(swipeReached(swipe, START)).toBe(false);
  });
});
