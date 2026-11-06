import { describe, expect, test } from "bun:test";

import {
  chartScale,
  gradientStops,
  nearestPlace,
  spreadPlaces,
  timeSpan,
} from "../src/ui/chart-scale";

describe("chartScale", () => {
  test("marks round figures round a chart's scores", () => {
    expect(chartScale(905_320, 951_200)).toEqual({
      low: 900_000,
      high: 960_000,
      ticks: [900_000, 920_000, 940_000, 960_000],
    });
  });

  test("marks figures of two places for a rating, with no fractions left behind", () => {
    const { low, high, ticks } = chartScale(8.682, 8.753);
    expect([low, high]).toEqual([8.68, 8.76]);
    expect(ticks).toEqual([8.68, 8.7, 8.72, 8.74, 8.76]);
  });

  test("starts at nothing for counts from nothing", () => {
    const { low, high } = chartScale(0, 937);
    expect(low).toBe(0);
    expect(high).toBeGreaterThanOrEqual(937);
  });

  test("leaves room above and below values all alike", () => {
    const { low, high } = chartScale(1000, 1000);
    expect(low).toBeLessThanOrEqual(1000);
    expect(high).toBeGreaterThan(low);
  });

  test("leaves room for nothing but nothing", () => {
    const { low, high } = chartScale(0, 0);
    expect(low).toBe(0);
    expect(high).toBeGreaterThan(0);
  });
});

describe("chartScale of shares", () => {
  test("stops at a hundred though the shares add up a hair over it", () => {
    expect(chartScale(0, 100.00000000000001).high).toBe(100);
  });
});

describe("gradientStops", () => {
  test("takes a CSS gradient's colours", () => {
    expect(gradientStops("linear-gradient(90deg, #ff5f6d, #47e891)")).toEqual([
      "#ff5f6d",
      "#47e891",
    ]);
  });

  test("has none for a plain colour", () => {
    expect(gradientStops("#abcdcd")).toBeNull();
    expect(gradientStops("light-dark(#dfe3e8, #3a4047)")).toBeNull();
  });
});

describe("spreadPlaces", () => {
  const spread = (wanted: readonly number[]) => spreadPlaces(wanted, 24, 12, 200);

  test("leaves labels with room where they want to be", () => {
    expect(spread([20, 60, 150])).toEqual([20, 60, 150]);
  });

  test("spreads equal values both ways round their place", () => {
    expect(spread([100, 100, 100])).toEqual([76, 100, 124]);
  });

  test("moves only the ones that would touch", () => {
    expect(spread([20, 100, 100, 180])).toEqual([20, 88, 112, 180]);
  });

  test("keeps labels below the top", () => {
    expect(spread([0, 2, 4])).toEqual([12, 36, 60]);
  });

  test("keeps labels above the bottom", () => {
    expect(spread([200, 200])).toEqual([176, 200]);
  });

  test("keeps every label apart when all of them fill the room", () => {
    const places = spreadPlaces([5, 5, 5, 5, 5, 5, 5, 5], 24, 12, 180);
    expect(places.slice(1).map((place, at) => place - (places[at] ?? 0))).toEqual(
      Array(7).fill(24),
    );
    expect(places[0]).toBe(12);
  });

  test("has nothing to place for nothing", () => {
    expect(spread([])).toEqual([]);
  });
});

describe("timeSpan", () => {
  test("runs from the earliest time to the latest, in whatever order they come", () => {
    expect(timeSpan([200, 50, 300])).toEqual({ first: 50, span: 250 });
  });

  test("has no span for one time", () => {
    expect(timeSpan([200])).toEqual({ first: 200, span: 0 });
  });
});

describe("nearestPlace", () => {
  test.each<[at: number, place: number]>([
    [-50, 0],
    [40, 0],
    [60, 1],
    [149, 1],
    [999, 2],
  ])("finds the time nearest %d at place %d", (at, place) => {
    expect(nearestPlace([0, 100, 200], at)).toBe(place);
  });
});
