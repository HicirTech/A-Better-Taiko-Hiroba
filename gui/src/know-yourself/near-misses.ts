import type { KnownChart } from "./known-charts";

/** A clear is near a full combo when its Bad are at most this many per mille of its notes. */
export const NEAR_BAD_PER_MILLE = 8;
/** A full combo is near a donderful when its OK are at most this many per mille of its notes. */
export const NEAR_OK_PER_MILLE = 15;

/** A chart and how many Bad, or OK, stand between it and its next crown. */
export interface NearMiss {
  readonly chart: KnownChart;
  readonly left: number;
}

const capOf = (notes: number, perMille: number) =>
  Math.max(1, Math.floor((notes * perMille) / 1000));

const byLeft = (left: NearMiss, right: NearMiss) =>
  left.left - right.left ||
  Number(left.chart.songNo) - Number(right.chart.songNo) ||
  left.chart.level - right.chart.level;

/** The charts close to their next crown, by the hits of their highest-score play. */
export function nearMisses(charts: readonly KnownChart[]): {
  readonly fullCombo: readonly NearMiss[];
  readonly donderful: readonly NearMiss[];
} {
  const fullCombo: NearMiss[] = [];
  const donderful: NearMiss[] = [];
  for (const chart of charts) {
    const { hits } = chart;
    if (hits === null) {
      continue;
    }
    // The play's own notes: the wiki's max combo can be a longer branch's.
    const notes = hits.good + hits.ok + hits.bad;
    if (chart.crown === "silver" && hits.bad >= 1 && hits.bad <= capOf(notes, NEAR_BAD_PER_MILLE)) {
      fullCombo.push({ chart, left: hits.bad });
    }
    // A full combo whose kept play has a Bad is not that play: its OK say nothing.
    if (
      chart.crown === "gold" &&
      hits.bad === 0 &&
      hits.ok >= 1 &&
      hits.ok <= capOf(notes, NEAR_OK_PER_MILLE)
    ) {
      donderful.push({ chart, left: hits.ok });
    }
  }
  return { fullCombo: fullCombo.sort(byLeft), donderful: donderful.sort(byLeft) };
}
