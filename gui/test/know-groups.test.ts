import { describe, expect, test } from "bun:test";

import {
  byBpm,
  byHitsPerSecond,
  byStars,
  type ChartGroup,
  groupId,
} from "../src/know-yourself/groups";
import { known } from "./known-fixtures";

const ids = (groups: readonly ChartGroup[]) => groups.map(({ key }) => groupId(key));
const steady = (bpm: number) => ({ min: bpm, max: bpm, wobbles: false });

describe("byStars", () => {
  test("groups by star level from the lowest, the charts without one last", () => {
    const groups = byStars([
      known({ songNo: "1", stars: 9 }),
      known({ songNo: "2", stars: null }),
      known({ songNo: "3", stars: 7 }),
      known({ songNo: "4", stars: 9 }),
    ]);

    expect(ids(groups)).toEqual(["stars-7", "stars-9", "unknown"]);
    expect(groups[1]?.charts.map((chart) => chart.songNo)).toEqual(["1", "4"]);
  });
});

describe("byHitsPerSecond", () => {
  test("bands half a hit per second wide, each from its lower end", () => {
    const groups = byHitsPerSecond([
      known({ hitsPerSecond: 5.2 }),
      known({ hitsPerSecond: 5.5 }),
      known({ hitsPerSecond: 4.99 }),
      known({ hitsPerSecond: null }),
    ]);

    expect(groups.map(({ key }) => key)).toEqual([
      { kind: "band", from: 4.5, to: 5 },
      { kind: "band", from: 5, to: 5.5 },
      { kind: "band", from: 5.5, to: 6 },
      { kind: "unknown" },
    ]);
  });
});

describe("byBpm", () => {
  test("bands one tempo 20 wide, a wobbling one too, the slowest and fastest in one band each", () => {
    const groups = byBpm([
      known({ bpm: steady(150) }),
      known({ bpm: steady(79.5) }),
      known({ bpm: steady(300) }),
      known({ bpm: steady(80) }),
      known({ bpm: { min: 120, max: 180, wobbles: false } }),
      known({ bpm: { min: 150, max: 150, wobbles: true } }),
      known({ bpm: { min: 150, max: 160, wobbles: true } }),
      known({ bpm: null }),
    ]);

    expect(groups.map(({ key }) => key)).toEqual([
      { kind: "band", from: null, to: 80 },
      { kind: "band", from: 80, to: 100 },
      { kind: "band", from: 140, to: 160 },
      { kind: "band", from: 300, to: null },
      { kind: "changing" },
      { kind: "unknown" },
    ]);
    expect(groups[2]?.charts).toHaveLength(2);
    expect(groups[4]?.charts).toHaveLength(2);
  });
});
