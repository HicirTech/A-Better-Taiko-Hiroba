import { describe, expect, test } from "bun:test";

import {
  movedPastSlop,
  NO_PULL,
  PULL_LIMIT_PX,
  PULL_RESISTANCE,
  PULL_SLOP_PX,
  PULL_THRESHOLD_PX,
  type PullContext,
  type PullState,
  pullMoved,
  pullReleased,
  pullStarted,
} from "../src/read-again/pull-gesture";

const START = { x: 200, y: 300 };

const landed = (overrides: Partial<PullContext> = {}): PullState =>
  pullStarted(START, { fingers: 1, scrollTopPx: 0, enabled: true, ...overrides });

const travelFor = (distancePx: number) => distancePx / PULL_RESISTANCE;

const movedDown = (state: PullState, ...downs: number[]) =>
  downs.reduce((now, down) => pullMoved(now, { x: START.x, y: START.y + down }, 0), state);

describe("pullStarted", () => {
  test("lets one finger on a page at its top begin a pull", () => {
    expect(landed()).toEqual({ phase: "undecided", start: START });
  });

  type StartCase = [label: string, context: Partial<PullContext>];
  test.each<StartCase>([
    ["a page scrolled down by a pixel", { scrollTopPx: 1 }],
    ["two fingers", { fingers: 2 }],
    ["a read or a write that is running", { enabled: false }],
  ])("never begins a pull for %s", (_label, context) => {
    expect(landed(context)).toBe(NO_PULL);
  });
});

describe("pullMoved", () => {
  test("decides nothing while the finger stays within the slop", () => {
    const state = landed();
    const within = PULL_SLOP_PX - 1;
    expect(pullMoved(state, { x: START.x + within, y: START.y + within }, 0)).toBe(state);
  });

  test("pulls once the finger goes down past the slop", () => {
    expect(movedDown(landed(), PULL_SLOP_PX)).toEqual({
      phase: "pulling",
      start: START,
      distancePx: PULL_SLOP_PX * PULL_RESISTANCE,
    });
  });

  type LeaveCase = [label: string, dx: number, dy: number];
  test.each<LeaveCase>([
    ["up", 0, -PULL_SLOP_PX],
    ["sideways", PULL_SLOP_PX * 2, PULL_SLOP_PX],
    ["as far sideways as down", PULL_SLOP_PX, PULL_SLOP_PX],
  ])("leaves a finger that goes %s to the page", (_label, dx, dy) => {
    const moved = pullMoved(landed(), { x: START.x + dx, y: START.y + dy }, 0);
    expect(moved).toBe(NO_PULL);
    expect(movedDown(moved, travelFor(PULL_LIMIT_PX))).toBe(NO_PULL);
  });

  test("follows the finger, held back, and stops at the limit", () => {
    const halfway = movedDown(landed(), PULL_SLOP_PX, travelFor(PULL_THRESHOLD_PX / 2));
    const past = movedDown(halfway, travelFor(PULL_LIMIT_PX) + 100);
    expect(halfway).toMatchObject({ distancePx: PULL_THRESHOLD_PX / 2 });
    expect(past).toMatchObject({ phase: "pulling", distancePx: PULL_LIMIT_PX });
  });

  test("rests at nothing with the finger back above where it landed", () => {
    expect(movedDown(landed(), PULL_SLOP_PX, -40)).toMatchObject({
      phase: "pulling",
      distancePx: 0,
    });
  });

  test("ends the pull once the page has scrolled under it", () => {
    const pulling = movedDown(landed(), PULL_SLOP_PX);
    expect(pullMoved(pulling, { x: START.x, y: START.y + 40 }, 1)).toBe(NO_PULL);
  });
});

describe("movedPastSlop", () => {
  type SlopCase = [label: string, dx: number, dy: number, moved: boolean];
  test.each<SlopCase>([
    ["within the slop both ways", PULL_SLOP_PX - 1, -(PULL_SLOP_PX - 1), false],
    ["down to the slop", 0, PULL_SLOP_PX, true],
    ["up to the slop", 0, -PULL_SLOP_PX, true],
    ["sideways to the slop", -PULL_SLOP_PX, 0, true],
  ])("says whether a finger that went %s moved past the slop: %p", (_label, dx, dy, moved) => {
    expect(movedPastSlop(START, { x: START.x + dx, y: START.y + dy })).toBe(moved);
  });
});

describe("pullReleased", () => {
  type ReleaseCase = [distancePx: number, reads: boolean];
  test.each<ReleaseCase>([
    [PULL_THRESHOLD_PX - 1, false],
    [PULL_THRESHOLD_PX, true],
    [PULL_LIMIT_PX, true],
  ])("reads again for a pull released at %p px: %p", (distancePx, reads) => {
    expect(pullReleased(movedDown(landed(), PULL_SLOP_PX, travelFor(distancePx)))).toBe(reads);
  });

  test("reads nothing for a touch that never pulled", () => {
    expect(pullReleased(NO_PULL)).toBe(false);
    expect(pullReleased(landed())).toBe(false);
    expect(pullReleased(movedDown(landed({ scrollTopPx: 1 }), travelFor(PULL_LIMIT_PX)))).toBe(
      false,
    );
  });
});
