import { describe, expect, test } from "bun:test";

import {
  matchesCharts,
  matchesFilter,
  NO_FILTER,
  type SongFilter,
} from "../src/favorites/song-filter";
import { song } from "./song-fixtures";

const INNER_TEN = song({
  songNo: "1004",
  genres: [4, 2],
  levels: { easy: 3, normal: 5, hard: 7, oni: 9, ura: 10 },
});
const EXTREME_TEN = song({
  songNo: "1003",
  genres: [4],
  levels: { easy: 4, normal: 6, hard: 8, oni: 10, ura: null },
});
const POPS_SEVEN = song({ songNo: "1002" });
const UNCHARTED = song({
  songNo: "1001",
  levels: { easy: null, normal: null, hard: null, oni: null, ura: null },
});
const SONGS = [INNER_TEN, EXTREME_TEN, POPS_SEVEN, UNCHARTED];

type FilterCase = [behaviour: string, filter: Partial<SongFilter>, taken: string[]];

describe("matchesFilter", () => {
  test.each<FilterCase>([
    [
      "takes every song with nothing chosen, one with no charts too",
      {},
      ["1004", "1003", "1002", "1001"],
    ],
    ["takes a song in any of its genres", { genre: 2 }, ["1004"]],
    ["takes only the chosen chart at the chosen level", { difficulty: "oni", level: 10 }, ["1003"]],
    ["tells the inner chart from the Extreme one", { difficulty: "ura", level: 10 }, ["1004"]],
    ["takes a chart of any difficulty for a level alone", { level: 10 }, ["1004", "1003"]],
    ["takes the songs with the chart for a difficulty alone", { difficulty: "ura" }, ["1004"]],
    ["takes a Hard chart at a level alone", { level: 8 }, ["1003"]],
    ["takes only the songs every part takes", { genre: 4, difficulty: "oni", level: 9 }, ["1004"]],
  ])("%s", (_behaviour, filter, taken) => {
    const chosen = { ...NO_FILTER, ...filter };
    expect(SONGS.filter((one) => matchesFilter(one, chosen)).map((one) => one.songNo)).toEqual(
      taken,
    );
  });
});

const FRONT = { easy: 3, normal: 5, hard: 7, oni: 9, ura: null } as const;
const INNER = { easy: null, normal: null, hard: null, oni: null, ura: 10 } as const;

describe("matchesCharts", () => {
  test("keeps a row only when its own charts meet the filter", () => {
    expect(matchesCharts(FRONT, { ...NO_FILTER, difficulty: "oni" })).toBe(true);
    expect(matchesCharts(INNER, { ...NO_FILTER, difficulty: "oni" })).toBe(false);
    expect(matchesCharts(FRONT, { ...NO_FILTER, difficulty: "ura" })).toBe(false);
    expect(matchesCharts(INNER, { ...NO_FILTER, difficulty: "ura" })).toBe(true);
    expect(matchesCharts(FRONT, { ...NO_FILTER, level: 10 })).toBe(false);
    expect(matchesCharts(INNER, { ...NO_FILTER, level: 10 })).toBe(true);
    expect(matchesCharts(INNER, { ...NO_FILTER, difficulty: "ura", level: 9 })).toBe(false);
    expect(matchesCharts(FRONT, NO_FILTER)).toBe(true);
    expect(matchesCharts(INNER, NO_FILTER)).toBe(true);
  });
});
