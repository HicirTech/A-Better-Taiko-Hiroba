import { describe, expect, test } from "bun:test";
import { chartKey, EMPTY_SCORE_BOOK, type Score, type ScoreBook } from "@abth/core";

import { listedChartsOf } from "../src/hiroba-session/listed-charts";

const score = (songNo: string, level: Score["level"], played: boolean): Score => ({
  taikoNo: "000000000000",
  songNo,
  level,
  crown: played ? "silver" : "none",
  scoreRank: played ? 5 : null,
  fidelity: played ? "detail" : "list",
  record: played
    ? {
        highScore: 900000,
        good: 400,
        ok: 20,
        bad: 1,
        drumroll: 9,
        maxCombo: 300,
        stageCount: 2,
        clearCount: 2,
        fullComboCount: 0,
        donderfulComboCount: 0,
        options: { speed: 1, doron: false, abekobe: false, random: "none", supportChart: null },
      }
    : null,
  fetchedAt: "2026-10-10T12:00:00.000Z",
});

const bookOf = (scores: readonly Score[], songs: readonly string[]): ScoreBook => ({
  ...EMPTY_SCORE_BOOK,
  songs: songs.map((songNo) => ({ songNo, title: `曲${songNo}`, genres: [1] })),
  scores: Object.fromEntries(scores.map((one) => [chartKey(one), one])),
});

describe("listedChartsOf", () => {
  test("lists played and unplayed charts in the game's order, with the hits of the detailed", () => {
    const book = bookOf(
      [score("1010", 4, true), score("1002", 5, false), score("1002", 4, true)],
      ["1002", "1010"],
    );

    const { charts } = listedChartsOf(book);

    expect(charts.map((chart) => `${chart.songNo}/${chart.level}`)).toEqual([
      "1002/4",
      "1002/5",
      "1010/4",
    ]);
    expect(charts[0]?.hits).toEqual({ highScore: 900000, good: 400, ok: 20, bad: 1 });
    expect(charts[1]?.hits).toBeNull();
  });

  test("leaves out a chart whose song no list names any more", () => {
    const book = bookOf([score("1002", 4, true), score("1003", 4, true)], ["1002"]);

    expect(listedChartsOf(book).charts.map((chart) => chart.songNo)).toEqual(["1002"]);
  });
});
