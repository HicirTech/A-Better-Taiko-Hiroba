// OurTaikoWiki's lists (MIT, ourtaiko.org; see ourtaiko-license.txt), shared by its ratings.
import type { Chart, Level } from "../hiroba-models";
import { chartKey } from "../scores";

const LEFT_OUT_SONGS: ReadonlySet<string> = new Set(["900"]);

/** Song numbers that hold one chart at a level: only the pair's better rating counts. */
const SAME_CHARTS: readonly (readonly [string, string, Level])[] = [
  ["399", "400", 4],
  ["399", "400", 5],
  ["450", "1257", 4],
  ["141", "1258", 4],
  ["137", "1259", 4],
  ["750", "1260", 4],
  ["527", "1261", 4],
  ["323", "1262", 4],
  ["939", "1263", 4],
  ["1146", "1264", 4],
  ["1146", "1264", 5],
  ["433", "1265", 5],
  ["433", "1265", 4],
  ["191", "1266", 4],
];

/** Charts where a donderful play is still rated by its hits rather than as perfect. */
const DONDERFUL_BY_HITS_CHARTS: readonly Chart[] = [
  { songNo: "775", level: 4 },
  { songNo: "775", level: 5 },
  { songNo: "1032", level: 5 },
  { songNo: "1037", level: 4 },
  { songNo: "1356", level: 4 },
];
const DONDERFUL_BY_HITS: ReadonlySet<string> = new Set(DONDERFUL_BY_HITS_CHARTS.map(chartKey));

const SAME_CHART_GROUP: ReadonlyMap<string, number> = new Map(
  SAME_CHARTS.flatMap(([first, second, level], group) => [
    [chartKey({ songNo: first, level }), group],
    [chartKey({ songNo: second, level }), group],
  ]),
);

export function isLeftOut(chart: Chart): boolean {
  return LEFT_OUT_SONGS.has(chart.songNo);
}

/** Whether a donderful play on this chart counts as perfect. */
export function donderfulCountsAsPerfect(chart: Chart): boolean {
  return !DONDERFUL_BY_HITS.has(chartKey(chart));
}

/** The charts, keeping only the best-rated chart of each same-chart pair. */
export function withoutSameCharts<T extends Chart>(
  charts: readonly T[],
  rating: (chart: T) => number,
): T[] {
  const best = new Map<number, T>();
  for (const chart of charts) {
    const group = SAME_CHART_GROUP.get(chartKey(chart));
    const kept = group === undefined ? undefined : best.get(group);
    if (group !== undefined && (kept === undefined || rating(chart) > rating(kept))) {
      best.set(group, chart);
    }
  }
  return charts.filter((chart) => {
    const group = SAME_CHART_GROUP.get(chartKey(chart));
    return group === undefined || best.get(group) === chart;
  });
}
