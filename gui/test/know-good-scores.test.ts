import { describe, expect, test } from "bun:test";

import { gatheringGroups, goodScores } from "../src/know-yourself/good-scores";
import { byStars } from "../src/know-yourself/groups";
import { known, unplayed } from "./known-fixtures";

const scored = (songNo: string, highScore: number, stars = 8) =>
  known({ songNo, stars, hits: { highScore, good: 500, ok: 20, bad: 5 } });

describe("goodScores", () => {
  test("takes the top tenth of the played charts by high score", () => {
    const charts = Array.from({ length: 25 }, (_, index) =>
      scored(String(1000 + index), 800000 + index * 1000),
    );

    expect([...goodScores([...charts, unplayed({ songNo: "2000" })])]).toEqual([
      "1024/4",
      "1023/4",
    ]);
  });

  test("takes one at least, the game's order breaking a tie", () => {
    expect([...goodScores([scored("1002", 900000), scored("1001", 900000)])]).toEqual(["1001/4"]);
    expect([...goodScores([unplayed()])]).toEqual([]);
  });
});

/** A star level's played charts, the first `good` of them good scores, and its keys of those. */
function level(stars: number, played: number, good: number) {
  const charts = Array.from({ length: played }, (_, index) =>
    scored(String(stars * 1000 + index), 900000, stars),
  );
  return { charts, good: charts.slice(0, good).map((chart) => `${chart.songNo}/4`) };
}

describe("gatheringGroups", () => {
  test("marks the group whose played charts are most often good scores, not the one with most", () => {
    const small = level(7, 10, 4);
    const big = level(8, 100, 20);

    const marked = gatheringGroups(
      byStars([...small.charts, ...big.charts]),
      new Set([...small.good, ...big.good]),
    );

    expect([...marked]).toEqual(["stars-7"]);
  });

  test("passes a group with fewer than ten played charts, and the group of no data", () => {
    const few = level(7, 9, 9);
    const some = level(8, 20, 2);
    const unknown = Array.from({ length: 12 }, (_, index) =>
      known({ songNo: String(5000 + index), stars: null }),
    );

    const marked = gatheringGroups(
      byStars([...few.charts, ...some.charts, ...unknown]),
      new Set([...few.good, ...some.good, ...unknown.map((chart) => `${chart.songNo}/4`)]),
    );

    expect([...marked]).toEqual(["stars-8"]);
  });

  test("marks every group tied for the largest share, and none without a good score", () => {
    const seven = level(7, 10, 2);
    const eight = level(8, 20, 4);
    const charts = [...seven.charts, ...eight.charts];

    expect([...gatheringGroups(byStars(charts), new Set([...seven.good, ...eight.good]))]).toEqual([
      "stars-7",
      "stars-8",
    ]);
    expect([...gatheringGroups(byStars(charts), new Set())]).toEqual([]);
  });
});
