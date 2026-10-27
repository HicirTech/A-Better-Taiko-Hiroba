import { describe, expect, test } from "bun:test";

import {
  type CrownState,
  type Level,
  type OurTaikoV2Chart,
  type OurTaikoV2Data,
  parseOurTaikoV2Data,
  parseRatingData,
  type RatingFigure,
  rateOurTaikoV2,
  ratePlayer,
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
  fetchedAt: "2026-10-27T00:00:00.000Z",
});

const BASE: OurTaikoV2Chart = {
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
const HARD: OurTaikoV2Chart = {
  lowConstant: 3.1,
  mainConstant: 3.2,
  highConstant: 2,
  stamina: 2.7,
  handSpeed: 4.6,
  burst: 4,
  complex: 0.7,
  rhythm: 1.1,
  notes: 500,
};

const dataOf = (charts: readonly (readonly [string, Level, OurTaikoV2Chart])[]): OurTaikoV2Data => {
  const songs = new Map<string, Map<Level, OurTaikoV2Chart>>();
  for (const [songNo, level, chart] of charts) {
    songs.set(songNo, new Map([...(songs.get(songNo) ?? []), [level, chart]]));
  }
  return songs;
};

const FIGURES = ["rating", "stamina", "speed", "burst", "accuracy", "rhythm", "complex"] as const;

type PlayCase = [label: string, play: Play, chart: OurTaikoV2Chart, figures: readonly number[]];

// Each play's figures, in FIGURES' order, as OurTaikoWiki's own code computes them.
const PLAYS: readonly PlayCase[] = [
  [
    "an Extreme play at 85 %",
    { songNo: "1", good: 700, ok: 300, bad: 0 },
    BASE,
    [
      4.593230735004, 4.299924670163, 5.344442385838, 1.12704186426, 3.464697961878, 1.002352356096,
      3.880473272048,
    ],
  ],
  [
    "an Extreme play at 92 %",
    { songNo: "2", good: 840, ok: 160, bad: 0 },
    BASE,
    [
      7.696863961044, 7.050041189848, 8.48586871956, 4.955807768353, 7.122430636339, 4.409783324177,
      6.403245974162,
    ],
  ],
  [
    "an Extreme play at 97 %",
    { songNo: "3", good: 940, ok: 60, bad: 0 },
    BASE,
    [
      9.916494392236, 8.501649545185, 10.545054056201, 8.936057364571, 9.666923911215,
      7.869573380123, 7.72292153485,
    ],
  ],
  [
    "an Extreme play at 96 % with 1.5 % Bad",
    { songNo: "4", good: 945, ok: 30, bad: 15 },
    BASE,
    [
      9.46353096345, 8.231758279125, 10.225232753756, 8.123721659769, 9.160021043451,
      7.152352149435, 4.67325236315,
    ],
  ],
  [
    "a donderful play",
    { songNo: "5", good: 1000, ok: 0, bad: 0, crown: "donderful" },
    BASE,
    [
      12.020160703725, 9.907306196022, 12.020160703725, 12.992579062133, 13.519747878142,
      11.42898986203, 9.522793229961,
    ],
  ],
  [
    "a Hard play",
    { songNo: "6", level: 3, good: 480, ok: 20, bad: 0 },
    HARD,
    [
      5.364655866098, 5.175108469979, 6.666457135078, 6.230166885305, 7.021359348906,
      3.488647559479, 2.903013259225,
    ],
  ],
  [
    "a play where burst equals hand speed",
    { songNo: "7", good: 940, ok: 60, bad: 0 },
    { ...BASE, burst: 11.5 },
    [
      9.916494392236, 8.501649545185, 10.545054056201, 8.284465887073, 9.666923911215,
      7.869573380123, 7.72292153485,
    ],
  ],
  [
    "a play on a chart of no hand speed",
    { songNo: "8", good: 940, ok: 60, bad: 0 },
    { ...BASE, handSpeed: 0 },
    [
      9.916494392236, 8.501649545185, 0.055482925858, 8.10771822698, 9.666923911215,
      10.016949532271, 7.72292153485,
    ],
  ],
  [
    "an Ura play at 99 %",
    { songNo: "9", level: 5, good: 985, ok: 15, bad: 0 },
    BASE,
    [
      11.318438857639, 9.408556054453, 11.539396159943, 11.657367978603, 11.607747143426,
      10.965476744413, 8.785279572665,
    ],
  ],
];

const figureOf = (rated: ReturnType<typeof rateOurTaikoV2>, figure: RatingFigure) =>
  rated.figures.find((one) => one.figure === figure);

describe("rateOurTaikoV2", () => {
  test.each(PLAYS)("rates %s as OurTaikoWiki does", (_label, play, chart, figures) => {
    const data = dataOf([[play.songNo, play.level ?? 4, chart]]);
    const [rated] = rateOurTaikoV2([scoreOf(play)], data).charts;
    FIGURES.forEach((figure, index) => {
      expect(rated?.figures[figure]).toBeCloseTo(figures[index] ?? Number.NaN, 10);
    });
  });

  test("names a chart by its constant at 95 % and lists every V2 figure in order", () => {
    const data = dataOf([["1", 4, BASE]]);
    const rated = rateOurTaikoV2([scoreOf({ songNo: "1", good: 940, ok: 60, bad: 0 })], data);
    expect(rated.system).toBe("ourtaikoV2");
    expect(rated.charts[0]?.constant).toBe(10);
    expect(rated.figures.map((figure) => figure.figure)).toEqual([...FIGURES]);
  });

  test("halves complexity at 3 % Bad hits, and keeps it whole with none", () => {
    const data = dataOf([
      ["1", 4, BASE],
      ["2", 4, BASE],
      ["3", 4, BASE],
    ]);
    const charts = rateOurTaikoV2(
      [
        scoreOf({ songNo: "1", good: 950, ok: 20, bad: 0 }),
        scoreOf({ songNo: "2", good: 945, ok: 30, bad: 15 }),
        scoreOf({ songNo: "3", good: 950, ok: 20, bad: 30 }),
      ],
      data,
    ).charts;
    const complexOf = (songNo: string) =>
      charts.find((chart) => chart.songNo === songNo)?.figures.complex ?? Number.NaN;
    expect(complexOf("3") / complexOf("1")).toBeCloseTo(0.5, 12);
    expect(complexOf("2") / complexOf("1")).toBeCloseTo(0.625, 12);
  });

  test("takes a figure from the best 20 charts, weighted to peak at places 10 and 11", () => {
    const ladder = Array.from({ length: 25 }, (_, k) => {
      const chart: OurTaikoV2Chart = {
        ...BASE,
        lowConstant: 6 + k * 0.15,
        mainConstant: 7 + k * 0.15,
        highConstant: 8 + k * 0.15,
        stamina: 5 + k * 0.2,
        handSpeed: 7 + k * 0.1,
        burst: 8 + k * 0.1,
        complex: 4 + k * 0.1,
        rhythm: 6 + k * 0.1,
      };
      return [String(101 + k), 4, chart] as const;
    });
    const scores = ladder.map(([songNo], k) =>
      scoreOf({ songNo, good: 900 + (k % 5) * 10, ok: 100 - (k % 5) * 10, bad: 0 }),
    );
    const rated = rateOurTaikoV2(scores, dataOf(ladder));
    expect(figureOf(rated, "rating")?.value).toBeCloseTo(8.93343753628, 10);
    expect(figureOf(rated, "burst")?.value).toBeCloseTo(8.618871016021, 10);
    expect(rated.figures.some((figure) => figure.compensated)).toBe(false);
  });

  test("raises a figure toward the top once its best 20, weighted from the first, reach 14", () => {
    const top: OurTaikoV2Chart = {
      ...BASE,
      lowConstant: 14,
      mainConstant: 14.8,
      highConstant: 15.5,
      stamina: 15,
      handSpeed: 15,
      burst: 15.5,
      complex: 15,
      rhythm: 15,
    };
    const charts = Array.from({ length: 20 }, (_, k) => [String(201 + k), 4, top] as const);
    const scores = charts.map(([songNo]) => scoreOf({ songNo, good: 985, ok: 15, bad: 0 }));
    const rated = rateOurTaikoV2(scores, dataOf(charts));
    expect(figureOf(rated, "rating")).toEqual({
      figure: "rating",
      value: expect.closeTo(14.981859363255, 10),
      compensated: true,
    });
    expect(figureOf(rated, "burst")).toEqual({
      figure: "burst",
      value: expect.closeTo(11.408379724557, 10),
      compensated: false,
    });
  });

  test("rates a donderful play as perfect, except on the charts listed to keep their hits", () => {
    const hits = { good: 900, ok: 100, bad: 0, crown: "donderful" } as const;
    const data = dataOf([
      ["1", 4, BASE],
      ["775", 4, BASE],
    ]);
    const charts = rateOurTaikoV2(
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
      ["1", 4, BASE],
      ["2", 4, BASE],
      ["900", 4, BASE],
      ["3", 4, BASE],
      ["4", 4, { ...BASE, notes: 0 }],
    ]);
    const unread: Score = { ...scoreOf({ songNo: "3", good: 1000, ok: 0, bad: 0 }), record: null };
    const rated = rateOurTaikoV2(
      [
        scoreOf({ songNo: "1", good: 600, ok: 200, bad: 200 }),
        scoreOf({ songNo: "2", good: 1000, ok: 1, bad: 0 }),
        scoreOf({ songNo: "900", good: 1000, ok: 0, bad: 0 }),
        scoreOf({ songNo: "1", level: 2, good: 1000, ok: 0, bad: 0 }),
        scoreOf({ songNo: "4", good: 0, ok: 0, bad: 0 }),
        unread,
      ],
      data,
    );
    expect(rated.charts).toEqual([]);
    expect(figureOf(rateOurTaikoV2([], data), "rating")?.value).toBe(0);
  });

  test("counts only the better of two song numbers that hold one chart", () => {
    const data = dataOf([
      ["399", 4, BASE],
      ["400", 4, BASE],
    ]);
    const rated = rateOurTaikoV2(
      [
        scoreOf({ songNo: "399", good: 900, ok: 100, bad: 0 }),
        scoreOf({ songNo: "400", good: 950, ok: 50, bad: 0 }),
      ],
      data,
    );
    expect(rated.charts.map((chart) => chart.songNo)).toEqual(["400"]);
  });
});

describe("parseOurTaikoV2Data", () => {
  const measured = {
    sub_constant_1: 9.005,
    main_constant: 10.035,
    sub_constant_2: 11.451,
    stamina: 7.859,
    handspeed: 11.611,
    burst: 12.749,
    complex: 6.6,
    rhythm: 10.706,
    totalNotes: 831,
  };

  test("reads each song's Hard, Extreme and Ura charts by song number", () => {
    const data = parseOurTaikoV2Data({
      "1": { oni: measured, hard: { ...measured, main_constant: 3.1 } },
      "520": { edit: { ...measured, main_constant: 10.6 } },
    });
    expect(data?.get("1")?.get(4)).toEqual({
      lowConstant: 9.005,
      mainConstant: 10.035,
      highConstant: 11.451,
      stamina: 7.859,
      handSpeed: 11.611,
      burst: 12.749,
      complex: 6.6,
      rhythm: 10.706,
      notes: 831,
    });
    expect(data?.get("1")?.get(3)?.mainConstant).toBe(3.1);
    expect(data?.get("520")?.get(5)?.mainConstant).toBe(10.6);
  });

  test("leaves out a malformed song or chart and keeps the rest", () => {
    const data = parseOurTaikoV2Data({
      "0": { oni: measured },
      "0817": { oni: measured },
      abc: { oni: measured },
      "2": "none",
      "3": { oni: { ...measured, totalNotes: 1.5 } },
      "4": { oni: { ...measured, burst: Number.NaN } },
      "5": { oni: { ...measured, complex: -1 } },
      "6": { oni: { ...measured, rhythm: "10" }, edit: measured },
      "7": { ura: measured },
    });
    expect([...(data?.keys() ?? [])]).toEqual(["6"]);
    expect([...(data?.get("6")?.keys() ?? [])]).toEqual([5]);
  });

  test("reads no data from an answer that is no object", () => {
    expect(parseOurTaikoV2Data([])).toBeNull();
    expect(parseOurTaikoV2Data(null)).toBeNull();
  });
});

describe("parseRatingData", () => {
  test("reads each system's feed into its own data, and rates by the system it names", () => {
    const v2 = parseRatingData("ourtaikoV2", {
      "1": {
        oni: {
          sub_constant_1: 9,
          main_constant: 10,
          sub_constant_2: 11.5,
          stamina: 8,
          handspeed: 11.5,
          burst: 12.7,
          complex: 6.6,
          rhythm: 10.7,
          totalNotes: 1000,
        },
      },
    });
    expect(v2?.system).toBe("ourtaikoV2");
    expect(parseRatingData("ourtaikoV1", { "1": {} })).toBeNull();
    const rated =
      v2 === null ? null : ratePlayer([scoreOf({ songNo: "1", good: 940, ok: 60, bad: 0 })], v2);
    expect(rated?.system).toBe("ourtaikoV2");
    expect(rated?.charts[0]?.figures.rating).toBeCloseTo(9.916494392236, 10);
  });
});
