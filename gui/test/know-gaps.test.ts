import { describe, expect, test } from "bun:test";

import { anchorOf, gapKindOf, gapsOf, nearestFirst, songsOf } from "../src/know-yourself/gaps";
import { known, unplayed } from "./known-fixtures";

const tried = (songNo: string, stars: number, highScore = 500000) =>
  known({ songNo, stars, crown: "played", hits: { highScore, good: 1, ok: 0, bad: 0 } });

describe("gapsOf", () => {
  test("keeps the charts never played or not cleared that have a star level", () => {
    const gaps = gapsOf([
      unplayed({ songNo: "1" }),
      tried("2", 8),
      known({ songNo: "3" }),
      unplayed({ songNo: "4", stars: null }),
    ]);

    expect(gaps.map((chart) => `${chart.songNo}:${gapKindOf(chart)}`)).toEqual([
      "1:never",
      "2:notCleared",
    ]);
  });
});

describe("anchorOf", () => {
  test("is the upper median star level of the cleared charts", () => {
    const cleared = [6, 9, 7, 8].map((stars, index) => known({ songNo: String(index), stars }));

    expect(anchorOf([...cleared, tried("9", 10)])).toBe(8);
    expect(anchorOf([tried("9", 10)])).toBeNull();
  });
});

describe("nearestFirst", () => {
  test("puts the nearest level first; a tie goes higher, then played, then the higher score", () => {
    const gaps = [
      unplayed({ songNo: "1", stars: 6 }),
      unplayed({ songNo: "2", stars: 8 }),
      tried("3", 8, 400000),
      tried("4", 8, 600000),
      unplayed({ songNo: "5", stars: 10 }),
      unplayed({ songNo: "6", stars: 7 }),
    ];

    expect(nearestFirst(gaps, 7).map((chart) => chart.songNo)).toEqual([
      "6",
      "4",
      "3",
      "2",
      "1",
      "5",
    ]);
  });

  test("starts from the lowest level when nothing is cleared", () => {
    const gaps = [unplayed({ songNo: "1", stars: 9 }), unplayed({ songNo: "2", stars: 4 })];

    expect(nearestFirst(gaps, null).map((chart) => chart.songNo)).toEqual(["2", "1"]);
  });
});

describe("songsOf", () => {
  test("names each song once, in the charts' order", () => {
    expect(
      songsOf([known({ songNo: "2" }), known({ songNo: "1" }), known({ songNo: "2", level: 5 })]),
    ).toEqual(["2", "1"]);
  });
});
