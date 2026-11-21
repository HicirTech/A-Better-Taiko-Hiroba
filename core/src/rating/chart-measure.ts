import type { Chart } from "../hiroba-models";
import { LOWEST_ACCURACY } from "./ourtaiko-formulas";
import { isLeftOut } from "./ourtaiko-lists";
import { ratingAtV1 } from "./ourtaiko-v1";
import { ratingAtV2 } from "./ourtaiko-v2";
import type { RatingData } from "./rating-data";

/** Halvings of the accuracy's range: far finer than one hit moves an accuracy. */
const HALVINGS = 30;

/** A chart as a rating's data measures it: its constant, and what a play of it rates. */
export interface MeasuredChart {
  /** As a rated chart's `constant`: V1's constant, V2's at 95 %. */
  readonly constant: number;
  /** What a play at an accuracy from 0.75 to 1 rates. */
  readonly ratingAt: (accuracy: number) => number;
}

/** The chart in the rating's data; none where the data lacks it or the rating leaves it out. */
export function measuredChart(data: RatingData, chart: Chart): MeasuredChart | null {
  if (isLeftOut(chart)) {
    return null;
  }

  if (data.system === "ourtaikoV1") {
    const measured = data.songs.get(chart.songNo)?.get(chart.level);
    return measured === undefined
      ? null
      : { constant: measured.constant, ratingAt: (accuracy) => ratingAtV1(measured, accuracy) };
  }

  const measured = data.songs.get(chart.songNo)?.get(chart.level);
  return measured === undefined
    ? null
    : { constant: measured.mainConstant, ratingAt: (accuracy) => ratingAtV2(measured, accuracy) };
}

/** The least accuracy, from 0.75 up, at which the chart rates `target`; none if 1 falls short. */
export function accuracyToRate({ ratingAt }: MeasuredChart, target: number): number | null {
  if (ratingAt(1) < target) {
    return null;
  }

  let low = LOWEST_ACCURACY;
  let high = 1;
  if (ratingAt(low) >= target) {
    return low;
  }

  for (let halving = 0; halving < HALVINGS; halving++) {
    const middle = (low + high) / 2;
    if (ratingAt(middle) >= target) {
      high = middle;
    } else {
      low = middle;
    }
  }
  return high;
}
