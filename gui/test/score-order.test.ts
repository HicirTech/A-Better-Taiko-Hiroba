import { describe, expect, test } from "bun:test";
import type { CrownState, Genre, Level } from "@abth/core";

import {
  type ListedScore,
  matchesScore,
  matchesSearch,
  type ScoreFilter,
  sortScores,
  startingFilter,
} from "../src/scores/score-order";

const NAMES = new Intl.Collator("ja");
const OPEN: ScoreFilter = { genres: [], difficulties: [], stars: [] };

/** A chart's score, by its song number and level, with what a test sets. */
function listed(
  songNo: string,
  level: Level,
  set: {
    name?: string;
    highScore?: number;
    crown?: CrownState;
    plays?: number;
    recent?: number | null;
    genres?: Genre[];
    stars?: number | null;
  } = {},
): ListedScore {
  const name = set.name ?? `曲 ${songNo}`;
  return {
    score: {
      songNo,
      songTitle: name,
      genre: set.genres?.[0] ?? 1,
      genres: set.genres ?? [1],
      level,
      crown: set.crown ?? "silver",
      scoreRank: 5,
      record: {
        highScore: set.highScore ?? 900000,
        good: 400,
        ok: 30,
        bad: 2,
        drumroll: 9,
        maxCombo: 120,
        stageCount: set.plays ?? 3,
        clearCount: 2,
        fullComboCount: 0,
        donderfulComboCount: 0,
        options: { speed: 1, doron: false, abekobe: false, random: "none", supportChart: null },
      },
      ranking: null,
      sections: [],
      recent: set.recent ?? null,
      fetchedAt: "2026-10-11T00:00:00.000Z",
    },
    name,
    nameLang: "ja",
    searched: [name],
    stars: set.stars ?? 7,
  };
}

const charts = (rows: readonly ListedScore[]) =>
  rows.map(({ score }) => `${score.songNo}/${score.level}`);

describe("sortScores", () => {
  test("by score, the highest first, a tie in song number and then level order", () => {
    const rows = [
      listed("1003", 4, { highScore: 950000 }),
      listed("1002", 5, { highScore: 900000 }),
      listed("1001", 4, { highScore: 990000 }),
      listed("1002", 4, { highScore: 900000 }),
    ];
    expect(charts(sortScores(rows, "score", NAMES))).toEqual([
      "1001/4",
      "1003/4",
      "1002/4",
      "1002/5",
    ]);
  });

  test("by recent plays, the newest first, and a chart they no longer show last by song number", () => {
    const rows = [
      listed("1004", 4),
      listed("1001", 4, { recent: 3 }),
      listed("1002", 4),
      listed("1003", 4, { recent: 0 }),
    ];
    expect(charts(sortScores(rows, "recent", NAMES))).toEqual([
      "1003/4",
      "1001/4",
      "1002/4",
      "1004/4",
    ]);
  });

  test("by crown, the donderful first and a played one last", () => {
    const rows = (["played", "gold", "donderful", "silver"] as const).map((crown, at) =>
      listed(String(1001 + at), 4, { crown }),
    );
    expect(sortScores(rows, "crown", NAMES).map(({ score }) => score.crown)).toEqual([
      "donderful",
      "gold",
      "silver",
      "played",
    ]);
  });

  test("by name with no sort chosen, as the player's language orders it", () => {
    const rows = [listed("1001", 4, { name: "ゆめ" }), listed("1002", 4, { name: "あさ" })];
    expect(charts(sortScores(rows, null, NAMES))).toEqual(["1002/4", "1001/4"]);
  });

  test("by plays, the most first", () => {
    const rows = [listed("1001", 4, { plays: 1 }), listed("1002", 4, { plays: 9 })];
    expect(charts(sortScores(rows, "plays", NAMES))).toEqual(["1002/4", "1001/4"]);
  });
});

describe("matchesScore and matchesSearch", () => {
  test("starts at Settings' difficulty, Extreme with its Ura charts, each a choice of its own", () => {
    const rows = ([1, 2, 3, 4, 5] as const).map((level) => listed("1001", level));
    const oni = rows.filter((row) => matchesScore(row, startingFilter("oni")));
    const ura = rows.filter((row) => matchesScore(row, { ...OPEN, difficulties: ["ura"] }));
    const easy = rows.filter((row) => matchesScore(row, startingFilter("easy")));
    expect(charts(oni)).toEqual(["1001/4", "1001/5"]);
    expect(charts(ura)).toEqual(["1001/5"]);
    expect(charts(easy)).toEqual(["1001/1"]);
  });

  test("takes a chart that matches any choice of each part, and every chart with none", () => {
    const rows = ([1, 2, 3, 4, 5] as const).map((level) => listed("1001", level));
    const twoOf = { ...OPEN, difficulties: ["easy", "hard"] } as const;
    expect(charts(rows.filter((row) => matchesScore(row, twoOf)))).toEqual(["1001/1", "1001/3"]);
    expect(rows.every((row) => matchesScore(row, OPEN))).toBe(true);
  });

  test("a genre takes any of the song's genres, and stars the chart's own level", () => {
    const row = listed("1012", 4, { genres: [2, 4], stars: 8 });
    expect(matchesScore(row, { ...OPEN, genres: [4] })).toBe(true);
    expect(matchesScore(row, { ...OPEN, genres: [6, 7] })).toBe(false);
    expect(matchesScore(row, { ...OPEN, stars: [7, 8] })).toBe(true);
    expect(matchesScore(row, { ...OPEN, stars: [7] })).toBe(false);
    expect(matchesScore({ ...row, stars: null }, { ...OPEN, stars: [8] })).toBe(false);
  });

  test("a search matches any of the song's folded names, and an empty one every chart", () => {
    const row = { ...listed("1001", 4), searched: ["sketch at dawn", "よあけのすけっち"] };
    expect(matchesSearch(row, "dawn")).toBe(true);
    expect(matchesSearch(row, "")).toBe(true);
    expect(matchesSearch(row, "night")).toBe(false);
  });
});
