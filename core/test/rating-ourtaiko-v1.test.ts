import { describe, expect, test } from "bun:test";

import {
  type CrownState,
  type Level,
  type OurTaikoV1Chart,
  type OurTaikoV1Data,
  parseOurTaikoV1Data,
  rateOurTaikoV1,
  type Score,
} from "../src/index";

interface Play {
  readonly songNo: string;
  readonly level?: Level;
  readonly good: number;
  readonly ok: number;
  readonly bad: number;
  readonly crown?: CrownState;
}

const scoreOf = ({ songNo, level = 4, good, ok, bad, crown = "silver" }: Play): Score => ({
  taikoNo: "000000000000",
  songNo,
  level,
  crown,
  scoreRank: 6,
  fidelity: "detail",
  record: {
    highScore: 900000,
    good,
    ok,
    bad,
    drumroll: 0,
    maxCombo: good,
    stageCount: 1,
    clearCount: 1,
    fullComboCount: 0,
    donderfulComboCount: crown === "donderful" ? 1 : 0,
    options: { speed: 1, doron: false, abekobe: false, random: "none", supportChart: null },
  },
  fetchedAt: "2026-10-12T00:00:00.000Z",
});

const chartOf = (constant: number, notes: number, profile = 50): OurTaikoV1Chart => ({
  constant,
  notes,
  composite: profile,
  averageDensity: profile,
  instantDensity: profile,
  separation: profile,
  tempoChange: 0,
});

const dataOf = (charts: readonly (readonly [string, Level, OurTaikoV1Chart])[]): OurTaikoV1Data => {
  const songs = new Map<string, Map<Level, OurTaikoV1Chart>>();
  for (const [songNo, level, chart] of charts) {
    songs.set(songNo, new Map([...(songs.get(songNo) ?? []), [level, chart]]));
  }
  return songs;
};

// A published V1 sheet's charts: constant, notes, 良, 可, 不可, and the sheet's rating.
const SHEET: readonly (readonly [number, number, number, number, number, number])[] = [
  [10.2, 792, 729, 62, 1, 9.27],
  [9.8, 913, 861, 52, 0, 9.06],
  [10.0, 1037, 955, 82, 0, 9.01],
  [10.1, 1062, 968, 87, 7, 8.89],
  [9.8, 765, 711, 53, 1, 8.85],
  [10.1, 797, 730, 55, 12, 8.82],
  [10.2, 1408, 1259, 146, 3, 8.8],
  [10.0, 976, 889, 82, 5, 8.77],
  [10.1, 858, 769, 89, 0, 8.74],
  [10.0, 868, 783, 85, 0, 8.7],
  [10.0, 876, 789, 86, 1, 8.66],
  [10.0, 915, 827, 82, 6, 8.62],
  [10.1, 915, 826, 75, 14, 8.58],
  [9.9, 703, 637, 63, 3, 8.58],
  [9.9, 926, 835, 91, 0, 8.58],
  [9.8, 745, 680, 61, 4, 8.55],
  [9.7, 994, 916, 78, 0, 8.51],
  [9.8, 1160, 1049, 111, 0, 8.5],
  [9.7, 832, 767, 63, 2, 8.48],
  [9.7, 802, 739, 58, 5, 8.42],
  [9.7, 821, 755, 62, 4, 8.41],
  [10.0, 976, 901, 27, 0, 8.25],
  [9.4, 520, 500, 20, 0, 8.23],
  [10.3, 1099, 939, 150, 10, 8.18],
];

const sheetPlays = (rows: typeof SHEET) => {
  const songNo = (index: number) => String(2001 + index);
  return {
    scores: rows.map(([, , good, ok, bad], index) =>
      scoreOf({ songNo: songNo(index), good, ok, bad }),
    ),
    data: dataOf(
      rows.map(([constant, notes], index) => [songNo(index), 4, chartOf(constant, notes)]),
    ),
  };
};

const ratingOf = (scores: readonly Score[], data: OurTaikoV1Data) =>
  rateOurTaikoV1(scores, data).figures.find((figure) => figure.figure === "rating");

describe("rateOurTaikoV1", () => {
  test.each(SHEET.map((row) => [row[5], row] as const))(
    "rates a chart %p as the published V1 does",
    (expected, row) => {
      const { scores, data } = sheetPlays([row]);
      const [chart] = rateOurTaikoV1(scores, data).charts;
      expect(chart?.figures.rating.toFixed(2)).toBe(expected.toFixed(2));
    },
  );

  test("takes the median of the player's best 20 charts as their rating", () => {
    const { scores, data } = sheetPlays(SHEET);
    const rating = ratingOf(scores, data);
    expect(rating?.value.toFixed(2)).toBe("8.68");
    expect(rating?.compensated).toBe(false);
  });

  test("lists the rated charts from the highest rating, with every V1 figure in order", () => {
    const { scores, data } = sheetPlays(SHEET.slice(0, 3));
    const rated = rateOurTaikoV1(scores, data);
    expect(rated.charts.map((chart) => chart.songNo)).toEqual(["2001", "2002", "2003"]);
    expect(rated.figures.map((figure) => figure.figure)).toEqual([
      "rating",
      "power",
      "stamina",
      "speed",
      "accuracy",
      "rhythm",
      "complex",
    ]);
  });

  test("rates a donderful play as perfect, except on the charts listed to keep their hits", () => {
    const hits = { good: 90, ok: 10, bad: 0, crown: "donderful" } as const;
    const data = dataOf([
      ["1", 4, chartOf(10.0, 100)],
      ["775", 4, chartOf(10.0, 100)],
    ]);
    const charts = rateOurTaikoV1(
      [scoreOf({ songNo: "1", ...hits }), scoreOf({ songNo: "775", ...hits })],
      data,
    ).charts;
    expect(charts.map((chart) => [chart.songNo, chart.accuracy])).toEqual([
      ["1", 1],
      ["775", 0.95],
    ]);
  });

  test("leaves out a chart under 75 %, over its notes, left out, without data or unread", () => {
    const data = dataOf([
      ["1", 4, chartOf(10.0, 100)],
      ["2", 4, chartOf(10.0, 100)],
      ["900", 4, chartOf(10.0, 100)],
      ["3", 4, chartOf(10.0, 100)],
    ]);
    const unread: Score = { ...scoreOf({ songNo: "3", good: 100, ok: 0, bad: 0 }), record: null };
    const rated = rateOurTaikoV1(
      [
        scoreOf({ songNo: "1", good: 60, ok: 20, bad: 20 }),
        scoreOf({ songNo: "2", good: 100, ok: 1, bad: 0 }),
        scoreOf({ songNo: "900", good: 100, ok: 0, bad: 0 }),
        scoreOf({ songNo: "1", level: 3, good: 100, ok: 0, bad: 0 }),
        unread,
      ],
      data,
    );
    expect(rated.charts).toEqual([]);
    expect(ratingOf([], data)?.value).toBe(0);
  });

  test("counts only the better of two song numbers that hold one chart", () => {
    const data = dataOf([
      ["399", 4, chartOf(10.0, 100)],
      ["400", 4, chartOf(10.0, 100)],
      ["399", 5, chartOf(10.0, 100)],
    ]);
    const rated = rateOurTaikoV1(
      [
        scoreOf({ songNo: "399", good: 90, ok: 10, bad: 0 }),
        scoreOf({ songNo: "400", good: 95, ok: 5, bad: 0 }),
        scoreOf({ songNo: "399", level: 5, good: 90, ok: 10, bad: 0 }),
      ],
      data,
    );
    expect(rated.charts.map((chart) => `${chart.songNo}/${chart.level}`)).toEqual([
      "400/4",
      "399/5",
    ]);
  });

  test("raises a figure toward the top of the scale once the best charts near it", () => {
    const rows = Array.from(
      { length: 20 },
      (_, index) => [String(index + 1), 4, chartOf(11.6, 100)] as const,
    );
    const perfect = rows.map(([songNo]) =>
      scoreOf({ songNo, good: 100, ok: 0, bad: 0, crown: "donderful" }),
    );
    const rating = ratingOf(perfect, dataOf(rows));
    expect(rating?.compensated).toBe(true);
    expect(rating?.value).toBeGreaterThan(15.5);
  });

  test("gives a chart with no density no stamina or speed, and keeps its other figures", () => {
    const data = dataOf([["1", 4, chartOf(10.0, 100, 0)]]);
    const [chart] = rateOurTaikoV1(
      [scoreOf({ songNo: "1", good: 95, ok: 5, bad: 0 })],
      data,
    ).charts;
    expect(Object.keys(chart?.figures ?? {}).sort()).toEqual([
      "accuracy",
      "complex",
      "power",
      "rating",
      "rhythm",
    ]);
  });
});

describe("parseOurTaikoV1Data", () => {
  const measured = {
    constant: 9.8,
    totalNotes: 765,
    rollSeconds: 8.08,
    balloonCount: 6,
    composite: 28.16,
    avgDensity: 40.99,
    instDensity: 66.98,
    separation: 14.53,
    bpmChange: 3.22,
    hsChange: 38.33,
  };

  test("reads each song's Oni and Ura charts by song number", () => {
    const data = parseOurTaikoV1Data([
      { id: 817, title: "a", constants: { oni: measured } },
      { id: "520", title: "b", constants: { oni: measured, ura: { ...measured, constant: 10.2 } } },
    ]);
    expect(data?.get("817")?.get(4)).toEqual({
      constant: 9.8,
      notes: 765,
      composite: 28.16,
      averageDensity: 40.99,
      instantDensity: 66.98,
      separation: 14.53,
      tempoChange: 3.22,
    });
    expect(data?.get("520")?.get(5)?.constant).toBe(10.2);
  });

  test("leaves out a malformed song or chart and keeps the rest", () => {
    const data = parseOurTaikoV1Data([
      { id: 0, constants: { oni: measured } },
      { id: "0817", constants: { oni: measured } },
      { id: 1.5, constants: { oni: measured } },
      { id: 2, constants: "none" },
      { id: 3, constants: { oni: { ...measured, totalNotes: 1.5 } } },
      { id: 4, constants: { oni: { ...measured, constant: 0 } } },
      { id: 5, constants: { oni: { ...measured, avgDensity: Number.NaN } } },
      { id: 6, constants: { oni: { ...measured, composite: -1 } }, ura: measured },
      { id: 7, constants: { oni: { ...measured, separation: "50" }, ura: measured } },
      { id: 8, constants: { oni: { ...measured, totalNotes: 0 } } },
      null,
    ]);
    expect([...(data?.keys() ?? [])]).toEqual(["7"]);
    expect([...(data?.get("7")?.keys() ?? [])]).toEqual([5]);
  });

  test("reads no data from an answer that is no list", () => {
    expect(parseOurTaikoV1Data({ oni: [] })).toBeNull();
    expect(parseOurTaikoV1Data(null)).toBeNull();
  });
});
