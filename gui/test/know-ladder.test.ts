import { describe, expect, test } from "bun:test";
import type { CrownState } from "@abth/core";

import { byStars } from "../src/know-yourself/groups";
import {
  CLEAR_SEGMENTS,
  clearCounts,
  middleRank,
  RANK_SEGMENTS,
  rankCounts,
  wallOf,
} from "../src/know-yourself/ladder";
import { known, unplayed } from "./known-fixtures";

/** A star level's charts: `cleared` cleared, `played` only played, `never` never played. */
const level = (stars: number, cleared: number, played: number, never = 0) => [
  ...Array.from({ length: cleared }, () => known({ stars })),
  ...Array.from({ length: played }, () => known({ stars, crown: "played", scoreRank: null })),
  ...Array.from({ length: never }, () => unplayed({ stars })),
];

describe("clearCounts", () => {
  test("counts each crown, never played first", () => {
    const crowns: CrownState[] = ["gold", "none", "silver", "none", "donderful", "played"];

    expect(clearCounts(crowns.map((crown) => known({ crown })))).toEqual([2, 1, 1, 1, 1]);
    expect(CLEAR_SEGMENTS).toEqual(["none", "played", "silver", "gold", "donderful"]);
  });
});

describe("rankCounts", () => {
  test("counts the tried charts' ranks, worst first, a tried chart without one as no rank", () => {
    const counts = rankCounts([
      known({ scoreRank: 8 }),
      known({ scoreRank: 2 }),
      known({ crown: "played", scoreRank: null }),
      unplayed(),
    ]);

    expect(RANK_SEGMENTS).toEqual(["none", 2, 3, 4, 5, 6, 7, 8]);
    expect(counts).toEqual([1, 1, 0, 0, 0, 0, 0, 1]);
  });
});

describe("wallOf", () => {
  test("names the lowest level with five tried charts where fewer than half are cleared", () => {
    const charts = [...level(6, 5, 0), ...level(7, 2, 3, 9), ...level(8, 0, 5)];

    expect(wallOf(byStars(charts))).toBe(7);
  });

  test("passes a level with fewer than five tried charts, or half of them cleared", () => {
    const charts = [...level(6, 0, 4, 20), ...level(7, 3, 3)];

    expect(wallOf(byStars(charts))).toBeNull();
  });
});

describe("middleRank", () => {
  test("is the rank at least half of the tried charts reach", () => {
    const charts = ([8, 2, 6, 5] as const).map((scoreRank) => known({ scoreRank }));

    expect(middleRank([...charts, unplayed(), unplayed()])).toBe(6);
    expect(middleRank(charts.slice(0, 3))).toBe(6);
  });

  test("counts a tried chart without a rank below every rank, and is none with no tried chart", () => {
    const unranked = known({ crown: "played", scoreRank: null });

    expect(middleRank([unranked, unranked, known({ scoreRank: 8 })])).toBe("none");
    expect(middleRank([unplayed()])).toBeNull();
  });
});
