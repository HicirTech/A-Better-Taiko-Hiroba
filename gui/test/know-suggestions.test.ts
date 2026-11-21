import { describe, expect, test } from "bun:test";
import {
  type CrownState,
  chartKey,
  type OurTaikoV2Chart,
  type RatedScore,
  type RatingData,
  ratePlayer,
} from "@abth/core";

import type { KnownChart } from "../src/know-yourself/known-charts";
import {
  favouritesOf,
  joyCharts,
  joyPickOf,
  ratedLevelOf,
  ratedPicksOf,
  SUGGESTED,
  shownBy,
} from "../src/know-yourself/suggestions";
import { known, unplayed } from "./known-fixtures";

// V2's constants sit on the rating's own scale, so a chart's constant reads as a rating.
const v2 = (main: number): OurTaikoV2Chart => ({
  lowConstant: main - 1,
  mainConstant: main,
  highConstant: main + 1,
  stamina: main,
  handSpeed: main,
  burst: main,
  complex: main,
  rhythm: main,
  notes: 1000,
});

/** Extreme charts by song number and constant. */
const dataOf = (
  constants: readonly (readonly [songNo: string, constant: number])[],
): RatingData => ({
  system: "ourtaikoV2",
  songs: new Map(constants.map(([songNo, constant]) => [songNo, new Map([[4, v2(constant)]])])),
});

type Play = [songNo: string, crown: CrownState, accuracy: number];

const scoreOf = ([songNo, crown, accuracy]: Play): RatedScore => ({
  songNo,
  level: 4,
  crown,
  record: {
    highScore: 900000,
    good: Math.round(accuracy * 1000),
    ok: 0,
    bad: 1000 - Math.round(accuracy * 1000),
    drumroll: 0,
    maxCombo: 100,
    stageCount: 1,
    clearCount: 1,
    fullComboCount: 0,
    donderfulComboCount: 0,
    options: { speed: 1, doron: false, abekobe: false, random: "none", supportChart: null },
  },
});

/** Twenty charts that count, all at constant 10: ten at 97 %, the last ten at 95 %. */
const COUNTING: readonly Play[] = Array.from(
  { length: 20 },
  (_, at): Play => [String(at + 1), "gold", at < 10 ? 0.97 : 0.95],
);
const COUNTING_CONSTANTS = COUNTING.map(([songNo]) => [songNo, 10] as const);

const ratedOf = (data: RatingData, plays: readonly Play[]) => ratePlayer(plays.map(scoreOf), data);

/** What a play at an accuracy rates, by the rating itself. */
function v2Rating(constant: number, accuracy: number): number {
  const [rated] = ratedOf(dataOf([["1", constant]]), [["1", "silver", accuracy]]).charts;
  return rated?.figures.rating ?? Number.NaN;
}

describe("ratedLevelOf", () => {
  test("takes the level and the usual accuracy from the middle of the charts that count", () => {
    // Constants 9.0 to 10.9 and accuracies 95.0 % to 98.8 %, each chart its own.
    const plays = Array.from(
      { length: 20 },
      (_, at): Play => [String(at + 1), "gold", (950 + 2 * at) / 1000],
    );
    const data = dataOf([
      ...plays.map(([songNo], at) => [songNo, 9 + at / 10] as const),
      ["21", 4] as const,
    ]);
    const level = ratedLevelOf(ratedOf(data, [...plays, ["21", "gold", 0.9]]));

    expect(level?.level).toBe(10);
    expect(level?.usual).toBe(0.97);
    expect(level?.floor).toBeCloseTo(v2Rating(9, 0.95), 10);
    expect(level?.counting.has("21/4")).toBe(false);
  });

  test("has no floor while fewer charts than count are rated, and no level with none", () => {
    const data = dataOf(COUNTING_CONSTANTS);

    expect(ratedLevelOf(ratedOf(data, COUNTING.slice(1)))?.floor).toBeNull();
    expect(ratedLevelOf(ratedOf(data, []))).toBeNull();
  });
});

describe("ratedPicksOf: a little harder", () => {
  const LEVEL_10: readonly Play[] = [["1", "gold", 0.95]];

  test("offers charts not cleared above the level, the nearest first, a played one first", () => {
    const data = dataOf([
      ["1", 10],
      ["2", 10.5],
      ["3", 10.5],
      ["4", 10.2],
      ["5", 9],
      ["6", 11],
      ["8", 10],
    ]);
    const charts = [
      known({ songNo: "1", crown: "gold" }),
      unplayed({ songNo: "2" }),
      known({ songNo: "3", crown: "played" }),
      known({ songNo: "4", crown: "silver" }),
      unplayed({ songNo: "5" }),
      unplayed({ songNo: "6" }),
      unplayed({ songNo: "7" }),
      unplayed({ songNo: "8" }),
    ];

    const { harder } = ratedPicksOf(charts, data, ratedOf(data, LEVEL_10));

    expect(harder.kind === "picked" && harder.level).toBe(10);
    expect(harder.kind === "picked" && harder.charts.map(({ chart }) => chart.songNo)).toEqual([
      "3",
      "2",
      "6",
    ]);
  });

  test("takes two song numbers of one chart as one, cleared if either is", () => {
    const data = dataOf([
      ["1", 10],
      ["450", 10.5],
      ["1257", 10.5],
      ["141", 10.6],
      ["1258", 10.6],
    ]);
    const charts = [
      known({ songNo: "1", crown: "gold" }),
      unplayed({ songNo: "450" }),
      unplayed({ songNo: "1257" }),
      known({ songNo: "141", crown: "silver" }),
      unplayed({ songNo: "1258" }),
    ];

    const { harder } = ratedPicksOf(charts, data, ratedOf(data, LEVEL_10));

    expect(harder.kind === "picked" && harder.charts.map(({ chart }) => chart.songNo)).toEqual([
      "450",
    ]);
  });

  test("offers as many charts as a set holds, at most", () => {
    const above = Array.from({ length: SUGGESTED + 1 }, (_, at) => String(at + 100));
    const data = dataOf([["1", 10], ...above.map((songNo) => [songNo, 11] as const)]);
    const charts = [
      known({ songNo: "1", crown: "gold" }),
      ...above.map((songNo) => unplayed({ songNo })),
    ];

    const { harder } = ratedPicksOf(charts, data, ratedOf(data, LEVEL_10));

    expect(harder.kind === "picked" && harder.charts.length).toBe(SUGGESTED);
  });

  test("never offers a chart of a song Hiroba took off its lists", () => {
    const data = dataOf([
      ["1", 10],
      ["2", 10.5],
      ["3", 10.5],
    ]);
    const charts = [
      known({ songNo: "1", crown: "gold" }),
      unplayed({ songNo: "2" }),
      known({ songNo: "3", crown: "played", removed: true }),
    ];

    const { harder } = ratedPicksOf(charts, data, ratedOf(data, LEVEL_10));

    expect(harder.kind === "picked" && harder.charts.map(({ chart }) => chart.songNo)).toEqual([
      "2",
    ]);
  });
});

describe("ratedPicksOf: scores in comfort", () => {
  // At the floor, a Const. 10 chart at 95 %, the others need about 95.6 % (9.5), 96.3 % (9)
  // and 98 % (8), against a usual 97 %.
  const data = dataOf([
    ...COUNTING_CONSTANTS,
    ["101", 10],
    ["102", 9.5],
    ["103", 9],
    ["104", 8],
    ["105", 10.5],
    ["106", 10],
    ["107", 10],
  ]);
  const plays: readonly Play[] = [
    ...COUNTING,
    ["101", "silver", 0.94],
    ["102", "gold", 0.95],
    ["103", "silver", 0.9],
    ["104", "silver", 0.96],
    ["105", "silver", 0.9],
    ["106", "played", 0.94],
  ];
  const charts = [
    ...COUNTING.map(([songNo]) => known({ songNo, crown: "gold" })),
    known({ songNo: "101", crown: "silver" }),
    known({ songNo: "102", crown: "gold" }),
    known({ songNo: "103", crown: "silver" }),
    known({ songNo: "104", crown: "silver" }),
    known({ songNo: "105", crown: "silver" }),
    known({ songNo: "106", crown: "played" }),
    known({ songNo: "107", crown: "silver" }),
  ];

  test("offers cleared charts within the level that would count, the smallest step first", () => {
    const { comfort } = ratedPicksOf(charts, data, ratedOf(data, plays));

    expect(comfort.kind === "picked" && comfort.usual).toBe(0.97);
    expect(
      comfort.kind === "picked" &&
        comfort.charts.map(({ chart, accuracy, needed }) => [
          chart.songNo,
          accuracy,
          Number(needed.toFixed(3)),
        ]),
    ).toEqual([
      ["102", 0.95, 0.956],
      ["101", 0.94, 0.95],
      ["103", 0.9, 0.963],
    ]);
  });

  test("waits until as many charts are rated as count", () => {
    const fewer = ratedOf(data, COUNTING.slice(1));

    expect(ratedPicksOf(charts, data, fewer).comfort).toEqual({ kind: "fewRated" });
    expect(ratedPicksOf(charts, data, fewer).harder.kind).toBe("picked");
  });
});

describe("ratedPicksOf: where the rating has nothing", () => {
  test("says the rating rates no chart of this difficulty", () => {
    const data = dataOf([["1", 10]]);
    const easy = [known({ songNo: "1", level: 1, difficulty: "easy" })];

    expect(ratedPicksOf(easy, data, ratedOf(data, [["1", "gold", 0.95]]))).toEqual({
      harder: { kind: "notRated" },
      comfort: { kind: "notRated" },
    });
  });

  test("says no chart is rated yet", () => {
    const data = dataOf([["1", 10]]);

    expect(ratedPicksOf([known({ songNo: "1" })], data, ratedOf(data, []))).toEqual({
      harder: { kind: "noneRated" },
      comfort: { kind: "noneRated" },
    });
  });
});

const steady = (bpm: number) => ({ min: bpm, max: bpm, wobbles: false });

describe("favouritesOf", () => {
  test("takes the middle of the plays: tempos of one tempo alone, every chart's hits per second", () => {
    const plays = new Map([
      ["1", 1],
      ["2", 5],
      ["3", 1],
      ["4", 100],
      ["5", 0],
    ]);
    const charts = [
      known({ songNo: "1", bpm: steady(150), hitsPerSecond: 4 }),
      known({ songNo: "2", bpm: steady(170), hitsPerSecond: 6 }),
      known({ songNo: "3", bpm: steady(200), hitsPerSecond: 5 }),
      known({ songNo: "4", bpm: { min: 120, max: 240, wobbles: false }, hitsPerSecond: 7 }),
      known({ songNo: "5", bpm: steady(300), hitsPerSecond: 9 }),
    ];

    expect(favouritesOf(charts, ({ songNo }) => plays.get(songNo) ?? 0)).toEqual({
      bpm: 170,
      hitsPerSecond: 7,
    });
  });

  test("takes the higher of two middles that share the plays evenly", () => {
    const charts = [
      known({ songNo: "1", bpm: steady(150), hitsPerSecond: 4 }),
      known({ songNo: "2", bpm: steady(170), hitsPerSecond: 6 }),
    ];

    expect(favouritesOf(charts, () => 2)).toEqual({ bpm: 170, hitsPerSecond: 6 });
  });

  test("names none without a play", () => {
    expect(favouritesOf([known()], () => 0)).toBeNull();
    expect(joyPickOf([known()], () => 0, { withNever: true, shown: new Set() })).toEqual({
      kind: "noPlays",
    });
  });
});

describe("joyCharts", () => {
  const FAVOURITES = { bpm: 170, hitsPerSecond: 6 };
  const plays = new Map([
    ["1", 3],
    ["2", 1],
    ["3", 1],
    ["4", 1],
    ["5", 1],
    ["6", 1],
    ["8", 1],
    ["9", 2],
  ]);
  const playsOf = ({ songNo }: KnownChart) => plays.get(songNo) ?? 0;
  const charts = [
    known({ songNo: "1", bpm: steady(170), hitsPerSecond: 6 }),
    known({ songNo: "2", bpm: steady(185), hitsPerSecond: 6.2 }),
    known({ songNo: "3", bpm: steady(172), hitsPerSecond: 6.1 }),
    known({ songNo: "4", bpm: steady(195), hitsPerSecond: 6 }),
    known({ songNo: "5", bpm: steady(170), hitsPerSecond: 6.6 }),
    known({ songNo: "6", bpm: { min: 160, max: 180, wobbles: false }, hitsPerSecond: 6 }),
    unplayed({ songNo: "7", bpm: steady(175), hitsPerSecond: 5.8 }),
    known({ songNo: "8", bpm: steady(170), hitsPerSecond: null }),
    known({ songNo: "9", crown: "played", bpm: steady(160), hitsPerSecond: 6.4 }),
  ];
  const songsOf = (picked: readonly KnownChart[]) => picked.map(({ songNo }) => songNo);

  test("offers charts within a band of both favourites, the least played first, then the nearest", () => {
    const picked = joyCharts(charts, playsOf, FAVOURITES, { withNever: true, shown: new Set() });

    expect(songsOf(picked)).toEqual(["7", "3", "2", "9", "1"]);
  });

  test("leaves the charts never played out when asked, and those another kind shows", () => {
    const shown = new Set([chartKey({ songNo: "3", level: 4 })]);
    const picked = joyCharts(charts, playsOf, FAVOURITES, { withNever: false, shown });

    expect(songsOf(picked)).toEqual(["2", "9", "1"]);
  });

  test("never offers a chart of a song Hiroba took off its lists", () => {
    const kept = charts.map((chart) =>
      chart.songNo === "3" ? { ...chart, removed: true } : chart,
    );
    const picked = joyCharts(kept, playsOf, FAVOURITES, { withNever: true, shown: new Set() });

    expect(songsOf(picked)).toEqual(["7", "2", "9", "1"]);
  });
});

describe("shownBy", () => {
  test("names the charts the rating's kinds show", () => {
    const chart = known({ songNo: "8" });

    expect([
      ...shownBy({
        harder: { kind: "picked", level: 10, charts: [{ chart, constant: 10.1 }] },
        comfort: { kind: "fewRated" },
      }),
    ]).toEqual(["8/4"]);
  });
});
