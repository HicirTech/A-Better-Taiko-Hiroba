import { describe, expect, test } from "bun:test";

import { FITTED, MAX_ZOOM, midpointOf, zoomedView } from "../src/songs/zoom";

const at = (view: { scale: number; x: number; y: number }, x: number, y: number) => ({
  x: view.x + x * view.scale,
  y: view.y + y * view.scale,
});

describe("zoomedView", () => {
  test("keeps the point between the fingers where it was", () => {
    const view = zoomedView(FITTED, 2, { x: 100, y: 50 }, { x: 100, y: 50 });
    expect(view.scale).toBe(2);
    expect(at(view, 100, 50)).toEqual({ x: 100, y: 50 });
  });

  test("moves the picture with the fingers as it zooms", () => {
    const start = zoomedView(FITTED, 2, { x: 100, y: 50 }, { x: 100, y: 50 });
    const moved = zoomedView(start, 3, { x: 100, y: 50 }, { x: 140, y: 70 });
    expect(at(moved, 100, 50)).toEqual({ x: 140, y: 70 });
  });

  test("goes no further than the largest zoom", () => {
    expect(zoomedView(FITTED, 50, { x: 0, y: 0 }, { x: 0, y: 0 }).scale).toBe(MAX_ZOOM);
  });

  test("falls back to the fitted picture at its own size or smaller", () => {
    const zoomed = zoomedView(FITTED, 2, { x: 30, y: 30 }, { x: 30, y: 30 });
    expect(zoomedView(zoomed, 0.5, { x: 30, y: 30 }, { x: 80, y: 80 })).toEqual(FITTED);
  });
});

describe("midpointOf", () => {
  test("is halfway between two fingers", () => {
    expect(midpointOf({ x: 0, y: 10 }, { x: 20, y: 30 })).toEqual({ x: 10, y: 20 });
  });
});
