import { chartKey } from "@abth/core";

import { type ChartGroup, groupId } from "./groups";
import type { KnownChart } from "./known-charts";

/** The share of the played charts, by high score, that count as the player's good scores. */
export const GOOD_PERCENT = 10;
/** The played charts a group needs before it can be marked: a few lucky ones say little. */
export const MARK_MIN_PLAYED = 10;

/** The keys of the charts whose high scores are among the best tenth, at least one. */
export function goodScores(charts: readonly KnownChart[]): ReadonlySet<string> {
  const scored = charts.filter((chart) => chart.hits !== null);
  const count = Math.max(1, Math.floor((scored.length * GOOD_PERCENT) / 100));
  const best = [...scored].sort(
    (left, right) =>
      (right.hits?.highScore ?? 0) - (left.hits?.highScore ?? 0) ||
      Number(left.songNo) - Number(right.songNo) ||
      left.level - right.level,
  );
  return new Set(best.slice(0, count).map(chartKey));
}

/** The groups where the largest share of the played charts are good scores, all on a tie. */
export function gatheringGroups(
  groups: readonly ChartGroup[],
  good: ReadonlySet<string>,
): ReadonlySet<string> {
  const rated = groups
    .filter(({ key }) => key.kind !== "unknown")
    .flatMap(({ key, charts }) => {
      const played = charts.filter((chart) => chart.hits !== null);
      const count = played.filter((chart) => good.has(chartKey(chart))).length;
      return played.length < MARK_MIN_PLAYED
        ? []
        : [{ id: groupId(key), count, played: played.length }];
    });
  // Shares compared by cross-multiplying, so a tie is exact.
  const best = rated.reduce<(typeof rated)[number] | null>(
    (most, one) =>
      most === null || one.count * most.played > most.count * one.played ? one : most,
    null,
  );
  return new Set(
    best === null || best.count === 0
      ? []
      : rated
          .filter((one) => one.count * best.played === best.count * one.played)
          .map(({ id }) => id),
  );
}
