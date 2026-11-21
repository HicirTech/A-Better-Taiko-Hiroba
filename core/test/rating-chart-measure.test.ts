import { describe, expect, test } from "bun:test";

import {
  accuracyToRate,
  type Chart,
  type Level,
  type MeasuredChart,
  measuredChart,
  type OurTaikoV1Chart,
  type OurTaikoV2Chart,
  type RatingData,
  rateOurTaikoV1,
  type Score,
} from "../src/index";

const v1Chart = (constant: number, notes = 1000): OurTaikoV1Chart => ({
  constant,
  notes,
  composite: 50,
  averageDensity: 50,
  instantDensity: 50,
  separation: 50,
  tempoChange: 0,
});

// The V2 test's chart, whose plays OurTaikoWiki's own code rated.
const V2_CHART: OurTaikoV2Chart = {
  lowConstant: 9,
  mainConstant: 10,
  highConstant: 11.5,
  stamina: 8,
  handSpeed: 11.5,
  burst: 12.7,
  complex: 6.6,
  rhythm: 10.7,
  notes: 1000,
};

const songsOf = <C>(charts: readonly (readonly [string, Level, C])[]) => {
  const songs = new Map<string, Map<Level, C>>();
  for (const [songNo, level, chart] of charts) {
    songs.set(songNo, new Map([...(songs.get(songNo) ?? []), [level, chart]]));
  }
  return songs;
};

const v1Data = (charts: readonly (readonly [string, Level, OurTaikoV1Chart])[]): RatingData => ({
  system: "ourtaikoV1",
  songs: songsOf(charts),
});

const v2Data = (charts: readonly (readonly [string, Level, OurTaikoV2Chart])[]): RatingData => ({
  system: "ourtaikoV2",
  songs: songsOf(charts),
});

const measured = (data: RatingData, chart: Chart): MeasuredChart => {
  const found = measuredChart(data, chart);
  if (found === null) {
    throw new Error(`no measure for ${chart.songNo}/${chart.level}`);
  }
  return found;
};

const play = (songNo: string, good: number, ok: number, bad: number): Score => ({
  taikoNo: "000000000000",
  songNo,
  level: 4,
  crown: "silver",
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
    donderfulComboCount: 0,
    options: { speed: 1, doron: false, abekobe: false, random: "none", supportChart: null },
  },
  fetchedAt: "2026-11-20T00:00:00.000Z",
});

describe("measuredChart", () => {
  test("rates a play at its accuracy as V1 rates that play", () => {
    const songs = songsOf([["1", 4, v1Chart(10.2, 792)]]);
    const [rated] = rateOurTaikoV1([play("1", 729, 62, 1)], songs).charts;

    const rating = measured({ system: "ourtaikoV1", songs }, { songNo: "1", level: 4 }).ratingAt(
      rated?.accuracy ?? 0,
    );

    expect(rated?.figures.rating).toBe(rating);
  });

  type V2Case = [accuracy: number, rating: number];

  test.each<V2Case>([
    [0.85, 4.593230735004],
    [0.92, 7.696863961044],
    [0.97, 9.916494392236],
  ])("rates a V2 play at %p as OurTaikoWiki's code does", (accuracy, rating) => {
    const data = v2Data([["1", 4, V2_CHART]]);

    expect(measured(data, { songNo: "1", level: 4 }).ratingAt(accuracy)).toBeCloseTo(rating, 10);
  });

  test("never rates a play lower for a higher accuracy", () => {
    const data = v1Data(
      [3, 7.5, 10, 11.6].map((constant, at) => [String(at + 1), 4, v1Chart(constant)]),
    );
    const charts = [
      ...[1, 2, 3, 4].map((at) => measured(data, { songNo: String(at), level: 4 })),
      measured(v2Data([["1", 4, V2_CHART]]), { songNo: "1", level: 4 }),
    ];
    const accuracies = Array.from({ length: 251 }, (_, step) => 0.75 + step / 1000);

    for (const chart of charts) {
      const ratings = accuracies.map((accuracy) => chart.ratingAt(accuracy));
      expect(ratings.every((rating, at) => at === 0 || rating >= (ratings[at - 1] ?? 0))).toBe(
        true,
      );
    }
  });

  test("takes V1's constant and V2's main constant", () => {
    expect(measured(v1Data([["1", 5, v1Chart(10.4)]]), { songNo: "1", level: 5 }).constant).toBe(
      10.4,
    );
    expect(measured(v2Data([["1", 3, V2_CHART]]), { songNo: "1", level: 3 }).constant).toBe(10);
  });

  test("measures no chart the data lacks, and none the rating leaves out", () => {
    const data = v1Data([
      ["1", 4, v1Chart(10)],
      ["900", 4, v1Chart(10)],
    ]);

    expect(measuredChart(data, { songNo: "1", level: 3 })).toBeNull();
    expect(measuredChart(data, { songNo: "2", level: 4 })).toBeNull();
    expect(measuredChart(data, { songNo: "900", level: 4 })).toBeNull();
  });
});

describe("accuracyToRate", () => {
  const chart = measured(v2Data([["1", 4, V2_CHART]]), { songNo: "1", level: 4 });

  test("finds the least accuracy at which the chart reaches a rating", () => {
    const target = chart.ratingAt(0.95);
    const found = accuracyToRate(chart, target) ?? 0;

    expect(found).toBeCloseTo(0.95, 7);
    expect(chart.ratingAt(found)).toBeGreaterThanOrEqual(target);
    expect(chart.ratingAt(found - 1e-6)).toBeLessThan(target);
  });

  test("starts from 75 %, below which no play is rated", () => {
    expect(accuracyToRate(chart, chart.ratingAt(0.75) - 0.5)).toBe(0.75);
  });

  test("finds none where a perfect play falls short", () => {
    expect(accuracyToRate(chart, chart.ratingAt(1) + 0.01)).toBeNull();
  });
});
