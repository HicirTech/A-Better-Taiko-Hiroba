import { describe, expect, test } from "bun:test";

import { framePointOf } from "../src/platform/frame-point";

const LANDSCAPE_FRAME = { width: 1920, height: 1080 };

describe("framePointOf", () => {
  test("puts the view's middle on the frame's middle", () => {
    expect(
      framePointOf({ x: 206, y: 457.5 }, { width: 412, height: 915 }, LANDSCAPE_FRAME),
    ).toEqual({
      x: 0.5,
      y: 0.5,
    });
  });

  test("finds a tap on the part of the frame a tall view shows, cut at its sides", () => {
    // 1080 tall shown 915 tall: 1626.7 wide, 607.3 of it cut off each side.
    const point = framePointOf({ x: 0, y: 0 }, { width: 412, height: 915 }, LANDSCAPE_FRAME);
    expect(point.y).toBe(0);
    expect(point.x).toBeCloseTo(607.33 / 1626.67, 4);
  });

  test("keeps a point on the frame", () => {
    const point = framePointOf({ x: -200, y: 2000 }, { width: 1280, height: 800 }, LANDSCAPE_FRAME);
    expect(point.x).toBe(0);
    expect(point.y).toBe(1);
  });
});
