import type { KnownChart } from "./known-charts";

/** How wide a band of hits per second is. */
export const HITS_PER_SECOND_STEP = 0.5;
/** How wide a band of BPM is. */
export const BPM_STEP = 20;
/** Tempos below this, and from this up, are one band each: few songs are that slow or that fast. */
export const BPM_LOW = 80;
export const BPM_HIGH = 300;

/** A row of charts: a star level, a band from `from` up to `to`, a changing tempo, or no data. */
export type GroupKey =
  | { readonly kind: "stars"; readonly stars: number }
  /** A band with no `from`, or no `to`, holds everything below, or above, the other end. */
  | { readonly kind: "band"; readonly from: number | null; readonly to: number | null }
  | { readonly kind: "changing" }
  | { readonly kind: "unknown" };

export interface ChartGroup {
  readonly key: GroupKey;
  readonly charts: readonly KnownChart[];
}

/** A group's name in the page's ids and in the sets of marked groups. */
export function groupId(key: GroupKey): string {
  switch (key.kind) {
    case "stars":
      return `stars-${key.stars}`;
    case "band":
      return `band-${key.from ?? "low"}`;
    default:
      return key.kind;
  }
}

const orderOf = (key: GroupKey): number =>
  key.kind === "stars"
    ? key.stars
    : key.kind === "band"
      ? (key.from ?? Number.NEGATIVE_INFINITY)
      : key.kind === "changing"
        ? Number.MAX_VALUE
        : Number.POSITIVE_INFINITY;

/** Groups lowest first, a changing tempo after them and no data last; empty groups are none. */
function groupBy(
  charts: readonly KnownChart[],
  keyOf: (chart: KnownChart) => GroupKey,
): readonly ChartGroup[] {
  const groups = new Map<string, { key: GroupKey; charts: KnownChart[] }>();
  for (const chart of charts) {
    const key = keyOf(chart);
    const id = groupId(key);
    const group = groups.get(id) ?? { key, charts: [] };
    group.charts.push(chart);
    groups.set(id, group);
  }
  return [...groups.values()].sort((left, right) => orderOf(left.key) - orderOf(right.key));
}

const band = (value: number, step: number): GroupKey => {
  const from = Math.floor(value / step) * step;
  return { kind: "band", from, to: from + step };
};

export const byStars = (charts: readonly KnownChart[]) =>
  groupBy(charts, ({ stars }) => (stars === null ? { kind: "unknown" } : { kind: "stars", stars }));

export const byHitsPerSecond = (charts: readonly KnownChart[]) =>
  groupBy(charts, ({ hitsPerSecond }) =>
    hitsPerSecond === null ? { kind: "unknown" } : band(hitsPerSecond, HITS_PER_SECOND_STEP),
  );

const bpmBand = (bpm: number): GroupKey =>
  bpm < BPM_LOW
    ? { kind: "band", from: null, to: BPM_LOW }
    : bpm >= BPM_HIGH
      ? { kind: "band", from: BPM_HIGH, to: null }
      : band(bpm, BPM_STEP);

/** By the one tempo the song search shows, wobbling or not; a range has no one BPM to band by. */
export const byBpm = (charts: readonly KnownChart[]) =>
  groupBy(charts, ({ bpm }) =>
    bpm === null
      ? { kind: "unknown" }
      : bpm.min !== bpm.max
        ? { kind: "changing" }
        : bpmBand(bpm.min),
  );
