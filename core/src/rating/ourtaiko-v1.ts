// OurTaikoWiki's rating V1 (MIT, ourtaiko.org; see ourtaiko-license.txt), its formulas unchanged.
import type { Level } from "../hiroba-models";
import {
  bestOf,
  blend,
  curvedAccuracy,
  ratedCharts,
  ratedPlay,
  SCALE_TOP,
  weightedAverage,
} from "./ourtaiko-formulas";
import type { ChartRating, PlayerFigure, PlayerRating, RatedScore, RatingFigure } from "./types";

/** One Oni or Ura chart's measurements in OurTaiko's V1 data. */
export interface OurTaikoV1Chart {
  readonly constant: number;
  readonly notes: number;
  readonly composite: number;
  readonly averageDensity: number;
  readonly instantDensity: number;
  readonly separation: number;
  readonly tempoChange: number;
}

/** V1's data by song number, then by level: 4 for Oni, 5 for Ura. */
export type OurTaikoV1Data = ReadonlyMap<string, ReadonlyMap<Level, OurTaikoV1Chart>>;

export const OURTAIKO_V1_FIGURES = [
  "rating",
  "power",
  "stamina",
  "speed",
  "accuracy",
  "rhythm",
  "complex",
] as const satisfies readonly RatingFigure[];

type V1Figure = (typeof OURTAIKO_V1_FIGURES)[number];

// As published: a constant the table lacks gets its lowest x.
const LOWEST_X = 0.05;

const X_OF_CONSTANT: ReadonlyMap<number, number> = new Map([
  [1.0, 0.05],
  [1.5, 0.1],
  [2.0, 0.15],
  [2.5, 0.2],
  [3.0, 0.25],
  [3.5, 0.3],
  [4.0, 0.35],
  [4.5, 0.4],
  [5.0, 0.45],
  [5.5, 0.5],
  [6.0, 0.55],
  [6.2, 0.65],
  [6.4, 0.75],
  [6.6, 0.85],
  [6.8, 0.95],
  [6.9, 1.0],
  [7.0, 1.14],
  [7.1, 1.29],
  [7.2, 1.43],
  [7.3, 1.57],
  [7.4, 1.71],
  [7.5, 1.86],
  [7.6, 2.0],
  [7.7, 2.25],
  [7.8, 2.5],
  [7.9, 2.75],
  [8.0, 3.0],
  [8.1, 3.25],
  [8.2, 3.5],
  [8.3, 3.75],
  [8.4, 4.0],
  [8.5, 4.25],
  [8.6, 4.5],
  [8.7, 4.75],
  [8.8, 5.0],
  [8.9, 5.333],
  [9.0, 5.666],
  [9.1, 6.0],
  [9.2, 6.333],
  [9.3, 6.666],
  [9.4, 7.0],
  [9.5, 7.5],
  [9.6, 8.0],
  [9.7, 8.5],
  [9.8, 9.0],
  [9.9, 9.25],
  [10.0, 9.5],
  [10.1, 9.75],
  [10.2, 10.0],
  [10.3, 10.5],
  [10.4, 11.0],
  [10.5, 11.333],
  [10.6, 11.666],
  [10.7, 12.0],
  [10.8, 12.5],
  [10.9, 13.0],
  [11.0, 13.333],
  [11.1, 13.666],
  [11.2, 14.0],
  [11.3, 14.5],
  [11.4, 15.0],
  [11.5, 15.25],
  [11.6, 15.5],
]);

/** The best charts' weights: the first 5 together 40 %, the next 5 30 %, 6 at 20 %, 4 at 10 %. */
const TOP_WEIGHTS: readonly number[] = [
  ...Array<number>(5).fill(0.4 / 5),
  ...Array<number>(5).fill(0.3 / 5),
  ...Array<number>(6).fill(0.2 / 6),
  ...Array<number>(4).fill(0.1 / 4),
];

interface FullScale {
  /** A player with perfect plays: the median and the weighted average of their best charts. */
  readonly middle: number;
  readonly average: number;
  /** A weighted average from here up raises the figure toward the top of the scale. */
  readonly threshold: number;
}

const FULL: Readonly<Record<V1Figure, FullScale>> = {
  rating: { middle: 15.27045948521676, average: 15.29963809348486, threshold: 14.58 },
  power: { middle: 15.260226313838062, average: 15.290645757225318, threshold: 14.54 },
  stamina: { middle: 14.680215140150393, average: 14.915699776343342, threshold: 13.36 },
  speed: { middle: 14.245030515698776, average: 14.585896650692296, threshold: 13.99 },
  accuracy: { middle: 15.384801656857972, average: 15.399022586450302, threshold: 15.03 },
  rhythm: { middle: 14.521553509242171, average: 14.831288974113518, threshold: 14.02 },
  complex: { middle: 13.744459013898052, average: 14.255545767147531, threshold: 13.45 },
};

/** The player's OurTaiko V1 rating, from every played Oni and Ura chart the data has. */
export function rateOurTaikoV1(scores: readonly RatedScore[], data: OurTaikoV1Data): PlayerRating {
  const charts = ratedCharts(scores, data, rateChart);
  return {
    system: "ourtaikoV1",
    figures: OURTAIKO_V1_FIGURES.map((figure) => playerFigure(figure, charts)),
    charts,
  };
}

function rateChart(score: RatedScore, chart: OurTaikoV1Chart): ChartRating | null {
  const play = ratedPlay(score, chart.notes);
  if (play === null) {
    return null;
  }

  const { accuracy } = play;
  const x = X_OF_CONSTANT.get(chart.constant) ?? LOWEST_X;
  const y = curvedAccuracy(accuracy);
  const rating = blend(x, y);
  const skill = (raw: number) => Math.sqrt((rating * raw * SCALE_TOP) / 100);
  // A chart measured with no density has no stamina or speed: its formula divides by zero.
  const skills = Object.entries({
    power: Math.sqrt(rating * x),
    stamina: skill(staminaOf(chart)),
    speed: skill(speedOf(chart)),
    accuracy: Math.sqrt(rating * y),
    rhythm: skill(rhythmOf(chart)),
    complex: skill(chart.composite),
  }).filter(([, value]) => Number.isFinite(value));
  return {
    songNo: score.songNo,
    level: score.level,
    accuracy,
    figures: { ...Object.fromEntries(skills), rating },
  };
}

function staminaOf({ averageDensity: average, instantDensity: instant }: OurTaikoV1Chart): number {
  return average > instant
    ? average + (average / 100) * (1 - instant / average) * (100 - average)
    : average - (1 - average / instant) * average;
}

function speedOf({ averageDensity: average, instantDensity: instant }: OurTaikoV1Chart): number {
  return instant > average
    ? instant - (1 - average / instant) * (instant - average)
    : instant + (1 - instant / average) * (average - instant);
}

function rhythmOf({ separation, tempoChange }: OurTaikoV1Chart): number {
  return separation + (separation / 100) * (tempoChange / 100) * (100 - separation);
}

function playerFigure(figure: V1Figure, charts: readonly ChartRating[]): PlayerFigure {
  const best = bestOf(charts.map((chart) => chart.figures[figure]));
  const middle = median(best);
  const average = weightedAverage(best, TOP_WEIGHTS);
  const full = FULL[figure];
  const compensated = Number(average.toFixed(2)) >= full.threshold;
  const value = compensated
    ? middle +
      ((average - full.threshold) / (full.average - full.threshold)) * (SCALE_TOP - full.middle)
    : middle;
  return { figure, value, compensated };
}

/** The median of values sorted from the highest. */
function median(values: readonly number[]): number {
  const half = Math.floor(values.length / 2);
  if (values.length === 0) {
    return 0;
  }
  return values.length % 2 === 1
    ? (values[half] ?? 0)
    : ((values[half - 1] ?? 0) + (values[half] ?? 0)) / 2;
}
