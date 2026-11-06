import { describe, expect, test } from "bun:test";

import {
  type ChartReading,
  type CrownState,
  chartReadings,
  crownsOverTime,
  playsOverTime,
  ranksOverTime,
  type ScoreChange,
} from "../src/index";

const dayOf = (time: string) => time.slice(0, 10);
const reading = (
  crown: CrownState,
  highScore: number | null,
  stageCount: number | null,
  fetchedAt: string | null,
): ChartReading => ({
  crown,
  scoreRank: null,
  highScore,
  stageCount,
  clearCount: null,
  fullComboCount: null,
  donderfulComboCount: null,
  good: null,
  ok: null,
  bad: null,
  drumroll: null,
  maxCombo: null,
  fetchedAt,
});
const change = (songNo: string, from: ChartReading, to: ChartReading): ScoreChange => ({
  songNo,
  level: 4,
  from,
  to,
});
const FIRST = "2026-10-01T10:00:00.000Z";
const SECOND = "2026-10-05T10:00:00.000Z";
const SECOND_LATER = "2026-10-05T18:00:00.000Z";
const BETWEEN = "2026-10-07T10:00:00.000Z";
const THIRD = "2026-10-09T10:00:00.000Z";

const SONG_A = [
  change("1", reading("silver", 800_000, 3, FIRST), reading("gold", 900_000, 5, SECOND)),
  change("1", reading("gold", 900_000, 5, SECOND), reading("gold", 950_000, 6, THIRD)),
];
const SONG_B = [
  change("2", reading("none", null, null, FIRST), reading("silver", 700_000, 2, SECOND_LATER)),
];

describe("chartReadings", () => {
  test("gives the reading each row replaced first, then each row's own", () => {
    expect(chartReadings(SONG_A).map(({ highScore }) => highScore)).toEqual([
      800_000, 900_000, 950_000,
    ]);
  });

  test("leaves out a first reading with no score", () => {
    expect(chartReadings(SONG_B).map(({ highScore }) => highScore)).toEqual([700_000]);
  });

  test("gives nothing for a chart with no rows", () => {
    expect(chartReadings([])).toEqual([]);
  });
});

describe("playsOverTime", () => {
  const charts = [
    { songNo: "1", level: 4 as const, stageCount: 6 },
    { songNo: "2", level: 4 as const, stageCount: 2 },
    { songNo: "3", level: 4 as const, stageCount: 10 },
  ];

  test("steps back from today's total, a day at a time, to the read the log began after", () => {
    expect(playsOverTime(charts, [...SONG_A, ...SONG_B], dayOf)).toEqual([
      { at: FIRST, value: 13 },
      { at: SECOND_LATER, value: 17 },
      { at: THIRD, value: 18 },
    ]);
  });

  test("keeps the days in order where a chart first read had no reading before it", () => {
    const newSong = [
      change("2", reading("none", null, null, null), reading("silver", 700_000, 2, SECOND)),
    ];
    const later = [
      change("1", reading("silver", 800_000, 3, BETWEEN), reading("gold", 900_000, 6, THIRD)),
    ];
    expect(playsOverTime(charts, [...newSong, ...later], dayOf).map(({ at }) => at)).toEqual([
      SECOND,
      THIRD,
    ]);
  });

  test("counts only the charts asked for", () => {
    const only = charts.filter(({ songNo }) => songNo === "1");
    expect(playsOverTime(only, [...SONG_A, ...SONG_B], dayOf).map(({ value }) => value)).toEqual([
      3, 5, 6,
    ]);
  });

  test("has no points with no rows", () => {
    expect(playsOverTime(charts, [], dayOf)).toEqual([]);
  });
});

describe("ranksOverTime", () => {
  const ranked = (songNo: string, from: ChartReading, to: ChartReading): ScoreChange =>
    change(songNo, from, to);
  const at = (rank: 5 | 6 | 7, highScore: number, time: string): ChartReading => ({
    ...reading("gold", highScore, 3, time),
    scoreRank: rank,
  });
  const charts = [
    { songNo: "1", level: 4 as const, crown: "gold" as const, scoreRank: 7 as const },
    { songNo: "2", level: 4 as const, crown: "silver" as const, scoreRank: 5 as const },
    { songNo: "3", level: 4 as const, crown: "played" as const, scoreRank: null },
    { songNo: "4", level: 4 as const, crown: "none" as const, scoreRank: null },
  ];
  const nothing = { none: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };

  test("steps each tried chart back to the rank it held, and one not tried yet out", () => {
    const rows = [
      ranked("1", at(5, 850_000, FIRST), at(6, 910_000, SECOND)),
      ranked("1", at(6, 910_000, SECOND), at(7, 960_000, THIRD)),
      ranked("2", reading("none", null, null, FIRST), at(5, 820_000, THIRD)),
    ];
    expect(ranksOverTime(charts, rows, dayOf).map(({ value }) => value)).toEqual([
      { ...nothing, none: 1, 5: 1 },
      { ...nothing, none: 1, 6: 1 },
      { ...nothing, none: 1, 5: 1, 7: 1 },
    ]);
  });

  test("counts no chart that was never tried", () => {
    const rows = [ranked("1", at(6, 910_000, FIRST), at(7, 960_000, THIRD))];
    const [, now] = ranksOverTime(charts, rows, dayOf);
    expect(Object.values(now?.value ?? {}).reduce((sum, count) => sum + count, 0)).toBe(3);
  });
});

describe("crownsOverTime", () => {
  const charts = [
    { songNo: "1", level: 4 as const, crown: "gold" as const },
    { songNo: "2", level: 4 as const, crown: "silver" as const },
    { songNo: "3", level: 4 as const, crown: "none" as const },
  ];

  test("steps each chart back to the crown it held", () => {
    expect(crownsOverTime(charts, [...SONG_A, ...SONG_B], dayOf)).toEqual([
      { at: FIRST, value: { none: 2, played: 0, silver: 1, gold: 0, donderful: 0 } },
      { at: SECOND_LATER, value: { none: 1, played: 0, silver: 1, gold: 1, donderful: 0 } },
      { at: THIRD, value: { none: 1, played: 0, silver: 1, gold: 1, donderful: 0 } },
    ]);
  });

  test("takes a row with no earlier details as no crown, whatever a list said", () => {
    const listedThenRead = [
      change("2", reading("silver", null, null, FIRST), reading("silver", 700_000, 2, SECOND)),
    ];
    const [before, after] = crownsOverTime(charts, listedThenRead, dayOf);
    expect(before?.value.silver).toBe(0);
    expect(after?.value.silver).toBe(1);
  });

  test("starts on the first day's end where the rows replaced that same day's reading", () => {
    const firstRead = [
      change("1", reading("gold", null, null, FIRST), reading("gold", 900_000, 2, FIRST)),
      change("1", reading("gold", 900_000, 2, FIRST), reading("gold", 950_000, 3, THIRD)),
    ];
    expect(crownsOverTime(charts, firstRead, dayOf).map(({ at }) => at)).toEqual([FIRST, THIRD]);
  });
});
