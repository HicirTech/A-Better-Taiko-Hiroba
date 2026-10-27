// OurTaikoWiki's rating V2 (MIT, ourtaiko.org; see ourtaiko-license.txt), its formulas unchanged.
import type { Level } from "../hiroba-models";
import {
  bestOf,
  blend,
  curvedAccuracy,
  type RatedPlay,
  ratedCharts,
  ratedPlay,
  SCALE_TOP,
  weightedAverage,
} from "./ourtaiko-formulas";
import type { ChartRating, PlayerFigure, PlayerRating, RatedScore, RatingFigure } from "./types";

/** One Hard, Oni or Ura chart's measurements in OurTaiko's V2 data. */
export interface OurTaikoV2Chart {
  /** The rating's constant up to 90 % accuracy; then the one at 95 %, and the one at 100 %. */
  readonly lowConstant: number;
  readonly mainConstant: number;
  readonly highConstant: number;
  readonly stamina: number;
  readonly handSpeed: number;
  readonly burst: number;
  readonly complex: number;
  readonly rhythm: number;
  readonly notes: number;
}

/** V2's data by song number, then by level: 3 for Hard, 4 for Oni, 5 for Ura. */
export type OurTaikoV2Data = ReadonlyMap<string, ReadonlyMap<Level, OurTaikoV2Chart>>;

export const OURTAIKO_V2_FIGURES = [
  "rating",
  "stamina",
  "speed",
  "burst",
  "accuracy",
  "rhythm",
  "complex",
] as const satisfies readonly RatingFigure[];

type V2Figure = (typeof OURTAIKO_V2_FIGURES)[number];

/** A figure's best charts, weighted to peak at places 10 and 11: the player's figure. */
const PEAK_WEIGHTS: readonly number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
];
/** The same, weighted down from the first: from 14 up, it raises the figure toward the top. */
const FALLING_WEIGHTS: readonly number[] = [
  20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
];
const RAISED_FROM = 14;
const PERFECT: RatedPlay = { accuracy: 1, badShare: 0 };

/** The player's OurTaiko V2 rating, from every played Hard, Oni and Ura chart the data has. */
export function rateOurTaikoV2(scores: readonly RatedScore[], data: OurTaikoV2Data): PlayerRating {
  const charts = ratedCharts(scores, data, rateChart);
  const topOf = perfectTops(data);
  return {
    system: "ourtaikoV2",
    figures: OURTAIKO_V2_FIGURES.map((figure) => playerFigure(figure, charts, topOf(figure))),
    charts,
  };
}

function rateChart(score: RatedScore, chart: OurTaikoV2Chart): ChartRating | null {
  const play = ratedPlay(score, chart.notes);
  if (play === null) {
    return null;
  }
  const figures = figuresOf(chart, play);
  // As published: a chart with a figure that is no number is not rated at all.
  return Object.values(figures).every(Number.isFinite)
    ? {
        songNo: score.songNo,
        level: score.level,
        accuracy: play.accuracy,
        constant: chart.mainConstant,
        figures,
      }
    : null;
}

function figuresOf(
  chart: OurTaikoV2Chart,
  { accuracy, badShare }: RatedPlay,
): Readonly<Record<V2Figure, number>> {
  const y = curvedAccuracy(accuracy);
  const rating = ratingOf(chart, accuracy, y);
  const speed = blend(chart.handSpeed, y);
  const speedFactor = chart.handSpeed > 0 ? Math.min(y / chart.handSpeed, 1) : 1;
  // Bad hits weigh on complexity alone: none keep all of it, 3 % and more half of it.
  const complexShare = (5000 / 9) * Math.max(0.03 - badShare, 0) ** 2 + 0.5;
  return {
    rating,
    stamina: blend(chart.stamina, y),
    speed,
    burst: burstOf(chart, y, speed, speedFactor),
    accuracy: Math.min(rating, y) + Math.log(Math.max(rating, y) - Math.min(rating, y) + 1),
    rhythm: blend(chart.rhythm, y) * speedFactor,
    complex: blend(chart.complex, y) * complexShare,
  };
}

/** From the low constant up to 90 %, toward the main one at 95 % and the high one at 100 %. */
function ratingOf(chart: OurTaikoV2Chart, accuracy: number, y: number): number {
  const at = (constant: number, share: number) => blend(constant, curvedAccuracy(share));
  const first = blend(accuracy <= 0.95 ? chart.lowConstant : chart.mainConstant, y);
  if (accuracy <= 0.9) {
    return first;
  }
  if (accuracy <= 0.95) {
    const from = at(chart.lowConstant, 0.9);
    return (
      from +
      ((at(chart.mainConstant, 0.95) - from) * (first - from)) /
        (at(chart.lowConstant, 0.95) - from)
    );
  }
  const from = at(chart.mainConstant, 0.95);
  return (
    from +
    ((at(chart.highConstant, 1) - from) * (first - from)) / (at(chart.mainConstant, 1) - from)
  );
}

/** Burst held to the hand speed: past the speed figure only as y passes the chart's hand speed. */
function burstOf(chart: OurTaikoV2Chart, y: number, speed: number, speedFactor: number): number {
  const burst = blend(chart.burst, y) * speedFactor;
  return burst > speed && chart.burst !== chart.handSpeed
    ? speed +
        Math.min(Math.max(y - chart.handSpeed, 0) / (chart.burst - chart.handSpeed), 1) *
          (burst - speed)
    : burst;
}

/** Each figure's falling average over the data's best charts, played perfectly. */
function perfectTops(data: OurTaikoV2Data): (figure: V2Figure) => number {
  const perfect = [...data.values()]
    .flatMap((charts) => [...charts.values()])
    .map((chart) => figuresOf(chart, PERFECT));
  return (figure) =>
    weightedAverage(bestOf(perfect.map((figures) => figures[figure])), FALLING_WEIGHTS);
}

function playerFigure(figure: V2Figure, charts: readonly ChartRating[], top: number): PlayerFigure {
  const best = bestOf(charts.map((chart) => chart.figures[figure]));
  const peak = weightedAverage(best, PEAK_WEIGHTS);
  const falling = weightedAverage(best, FALLING_WEIGHTS);
  const compensated = falling >= RAISED_FROM && top > RAISED_FROM;
  const value = compensated
    ? peak + ((falling - RAISED_FROM) / (top - RAISED_FROM)) * (SCALE_TOP - peak)
    : peak;
  return { figure, value, compensated };
}
