import type { CrownState, ScoreRank } from "@abth/core";

import { RANKS_WORST_FIRST } from "../my-page/panel-colours";
import type { ChartGroup } from "./groups";
import { isCleared, isTried, type KnownChart } from "./known-charts";

/** The tried charts a star level needs before it can be the wall. */
export const WALL_MIN_TRIED = 5;

/** Each chart's best crown, from never played to donderful. */
export const CLEAR_SEGMENTS: readonly CrownState[] = [
  "none",
  "played",
  "silver",
  "gold",
  "donderful",
];

/** A tried chart's score rank, "none" where it has none yet; the worst rank first. */
export type RankSegment = ScoreRank | "none";
export const RANK_SEGMENTS: readonly RankSegment[] = ["none", ...RANKS_WORST_FIRST];

/** How many charts sit in each of `CLEAR_SEGMENTS`, in its order. */
export const clearCounts = (charts: readonly KnownChart[]): number[] =>
  CLEAR_SEGMENTS.map((crown) => charts.filter((chart) => chart.crown === crown).length);

/** How many tried charts sit in each of `RANK_SEGMENTS`, in its order. */
export const rankCounts = (charts: readonly KnownChart[]): number[] =>
  RANK_SEGMENTS.map(
    (rank) =>
      charts.filter((chart) => isTried(chart) && (chart.scoreRank ?? "none") === rank).length,
  );

/** The lowest star level with enough tried charts where fewer than half of them are cleared. */
export function wallOf(groups: readonly ChartGroup[]): number | null {
  for (const { key, charts } of groups) {
    if (key.kind !== "stars") {
      continue;
    }
    const tried = charts.filter(isTried).length;
    if (tried >= WALL_MIN_TRIED && 2 * charts.filter(isCleared).length < tried) {
      return key.stars;
    }
  }
  return null;
}

/** The rank at least half the tried charts reach: the upper middle of their ranks, worst first. */
export function middleRank(charts: readonly KnownChart[]): RankSegment | null {
  const places = charts
    .filter(isTried)
    .map((chart) => RANK_SEGMENTS.indexOf(chart.scoreRank ?? "none"))
    .sort((left, right) => left - right);
  const middle = places[Math.floor(places.length / 2)];
  return middle === undefined ? null : (RANK_SEGMENTS[middle] ?? null);
}
