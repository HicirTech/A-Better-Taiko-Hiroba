import { isCleared, type KnownChart } from "./known-charts";

/** What a chart still to close lacks: any play at all, or a clear. */
export type GapKind = "never" | "notCleared";

export const gapKindOf = (chart: KnownChart): GapKind | null =>
  chart.crown === "none" ? "never" : chart.crown === "played" ? "notCleared" : null;

/** The charts still to close; one taiko.wiki gives no star level is never suggested. */
export const gapsOf = (charts: readonly KnownChart[]) =>
  charts.filter((chart) => gapKindOf(chart) !== null && chart.stars !== null);

/** The middle value, the higher of the two middles of an even count; none of no values. */
export function upperMedian(values: readonly number[]): number | null {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? null;
}

/** The upper median star level of the cleared charts: where the player stands. */
export const anchorOf = (charts: readonly KnownChart[]): number | null =>
  upperMedian(charts.filter(isCleared).flatMap(({ stars }) => (stars === null ? [] : [stars])));

/** The gaps nearest the player's level first; then the higher level, then the played chart. */
export function nearestFirst(gaps: readonly KnownChart[], anchor: number | null): KnownChart[] {
  const target = anchor ?? Math.min(...gaps.map(({ stars }) => stars ?? 0));
  const distance = ({ stars }: KnownChart) => Math.abs((stars ?? 0) - target);
  return [...gaps].sort(
    (left, right) =>
      distance(left) - distance(right) ||
      (right.stars ?? 0) - (left.stars ?? 0) ||
      Number(right.crown === "played") - Number(left.crown === "played") ||
      (right.hits?.highScore ?? 0) - (left.hits?.highScore ?? 0) ||
      Number(left.songNo) - Number(right.songNo) ||
      left.level - right.level,
  );
}

/** The charts' songs, each once, in their order: a set holds songs, not charts. */
export const songsOf = (charts: readonly KnownChart[]): string[] => [
  ...new Set(charts.map(({ songNo }) => songNo)),
];
