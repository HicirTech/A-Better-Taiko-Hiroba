import { describe, expect, test } from "bun:test";

import {
  OPENING_AREA_SHARE,
  type PipelinesSwipeContext,
  pipelinesSwipeStarted,
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
/** A list as wide as the panel, which ends left of where a page's own swipes begin. */
const LIST_RIGHT_PX = 240;

const landed = (at: TouchPoint = START, overrides: Partial<SwipeContext> = {}) =>
  swipeStarted(at, {
    fingers: 1,
    menuOpen: false,
    windowWidthPx: WINDOW_WIDTH_PX,
    claimed: false,
    ...overrides,
  });

describe("pipelinesSwipeStarted", () => {
  const landedFor = (context: Partial<PipelinesSwipeContext>, at: TouchPoint = START) =>
    pipelinesSwipeStarted(at, {
      fingers: 1,
      pagesShown: false,
      pipelinesShown: false,
      listRightPx: LIST_RIGHT_PX,
      claimed: false,
      ...context,
    });

  test("lets one finger on the pages' list begin the swipe right to the pipelines page", () => {
    expect(landedFor({ pagesShown: true })).toEqual({ start: START, direction: "right" });
  });

  test("begins that swipe on the list only, never on the page beside it", () => {
    const edge = { x: LIST_RIGHT_PX, y: START.y };
    const beyond = { x: LIST_RIGHT_PX + 1, y: START.y };
    expect(landedFor({ pagesShown: true }, edge)).toEqual({ start: edge, direction: "right" });
    expect(landedFor({ pagesShown: true }, beyond)).toBeNull();
  });

  test("lets one finger anywhere on the pipelines page begin the swipe left back", () => {
    const farRight = { x: WINDOW_WIDTH_PX - 1, y: START.y };
    expect(landedFor({ pipelinesShown: true }, farRight)).toEqual({
      start: farRight,
      direction: "left",
    });
  });

  type RefusedCase = [label: string, context: Partial<PipelinesSwipeContext>];
  test.each<RefusedCase>([
    ["a page with no pages' list in view", {}],
    ["two fingers on the pages' list", { pagesShown: true, fingers: 2 }],
    ["two fingers on the pipelines page", { pipelinesShown: true, fingers: 2 }],
    ["a touch that a text field or a dialog has", { pipelinesShown: true, claimed: true }],
  ])("never begins one for %s", (_label, context) => {
    expect(landedFor(context)).toBeNull();
  });
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
