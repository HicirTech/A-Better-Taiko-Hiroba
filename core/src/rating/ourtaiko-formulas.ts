// OurTaikoWiki's formulas both its ratings use (MIT, ourtaiko.org; see ourtaiko-license.txt).
import type { Level } from "../hiroba-models";
import { donderfulCountsAsPerfect, isLeftOut, withoutSameCharts } from "./ourtaiko-lists";
import type { ChartRating, RatedScore } from "./types";

/** Where every figure of a perfect play sits. */
export const SCALE_TOP = 15.5;
/** The best charts a player's figure is taken from. */
const COUNTED = 20;
const LOWEST_ACCURACY = 0.75;

/** How a play went, as the ratings count it. */
export interface RatedPlay {
  /** From 0.75 to 1. */
  readonly accuracy: number;
  /** The share of the chart's notes hit Bad. */
  readonly badShare: number;
}

/** Each played chart the data has, rated, a chart under two song numbers once, highest first. */
export function ratedCharts<C>(
  scores: readonly RatedScore[],
  data: ReadonlyMap<string, ReadonlyMap<Level, C>>,
  rate: (score: RatedScore, chart: C) => ChartRating | null,
): ChartRating[] {
  const rated = scores.flatMap((score) => {
    const chart = data.get(score.songNo)?.get(score.level);
    const rating = chart === undefined || isLeftOut(score) ? null : rate(score, chart);
    return rating === null ? [] : [rating];
  });
  return withoutSameCharts(rated, (chart) => chart.figures.rating).sort(
    (a, b) => b.figures.rating - a.figures.rating,
  );
}

/** The play on a chart of `notes`; null when unread, under 75 % or with more hits than notes. */
export function ratedPlay(score: RatedScore, notes: number): RatedPlay | null {
  const { record } = score;
  if (record === null) {
    return null;
  }
  const donderful = score.crown === "donderful" || (record.donderfulComboCount ?? 0) > 0;
  if (donderful && donderfulCountsAsPerfect(score)) {
    return { accuracy: 1, badShare: 0 };
  }
  if (record.good + record.ok + record.bad > notes) {
    return null;
  }
  const accuracy = notes > 0 ? (record.good + record.ok / 2) / notes : 0;
  return accuracy < LOWEST_ACCURACY || accuracy > 1
    ? null
    : { accuracy, badShare: record.bad / notes };
}

/** The accuracy on the rating's scale: 0 at 75 %, then a power, a line and an exponential piece. */
export function curvedAccuracy(accuracy: number): number {
  const low = (value: number) => 16730 * (value - 0.75) ** 3.805;
  const middle = (value: number) => 56.4468 * value - 45.7187;
  // biome-ignore lint/suspicious/noApproximativeNumericConstant: the published base is 2.718.
  const high = (value: number) => 0.2246 * 2.718 ** (120 * (value - 0.972)) + 9.02;
  const lowEnd = 0.8278;
  const middleEnd = 0.9793;
  if (accuracy <= LOWEST_ACCURACY) {
    return 0;
  }
  if (accuracy <= lowEnd) {
    return low(accuracy);
  }
  if (accuracy <= middleEnd) {
    return middle(accuracy);
  }
  return (
    high(middleEnd) +
    ((high(accuracy) - high(middleEnd)) / (high(1) - high(middleEnd))) *
      (SCALE_TOP - high(middleEnd))
  );
}

/** A weighted power mean of a chart's measure x and the curved accuracy y. */
export function blend(x: number, y: number): number {
  const termP = 150 ** 2 - (x - y) ** 2 / 2;
  const p = termP < 0 ? 150 : 150 - Math.sqrt(termP);
  const termW = 25 - (x - 15.5) ** 2 / 25 - (y - 23) ** 2 / 69;
  const w = termW < 0 ? 0.5 : Math.max(Math.sqrt(termW) - 4, 0.5);
  return p === 0 ? x ** w * y ** (1 - w) : (w * x ** p + (1 - w) * y ** p) ** (1 / p);
}

/** The `COUNTED` highest of the values that are numbers, the highest first. */
export function bestOf(values: readonly (number | undefined)[]): number[] {
  return values
    .filter((value): value is number => value !== undefined && Number.isFinite(value))
    .sort((a, b) => b - a)
    .slice(0, COUNTED);
}

export function weightedAverage(values: readonly number[], weights: readonly number[]): number {
  let sum = 0;
  let weightSum = 0;
  values.slice(0, weights.length).forEach((value, index) => {
    const weight = weights[index] ?? 0;
    sum += value * weight;
    weightSum += weight;
  });
  return weightSum === 0 ? 0 : sum / weightSum;
}
