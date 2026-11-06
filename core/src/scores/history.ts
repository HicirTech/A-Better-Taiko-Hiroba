import type { Chart, CrownState, ScoreRank } from "../hiroba-models";
import { chartKey } from "./book";
import { type ChartReading, crownBefore, type ScoreChange } from "./changes";

/** A reading that told a score, and when. */
export type DatedReading = ChartReading & {
  readonly highScore: number;
  readonly fetchedAt: string;
};

/** How something stood at the end of a day the log read something. */
export interface DayPoint<Value> {
  /** The day's last read, as an ISO time. */
  readonly at: string;
  readonly value: Value;
}

/** The calendar day a time falls on, written so that days sort by their words. */
export type DayOf = (time: string) => string;

const isDated = (reading: ChartReading): reading is DatedReading =>
  reading.highScore !== null && reading.fetchedAt !== null;

/** A chart's readings as its own rows tell them, oldest first. */
export function chartReadings(changes: readonly ScoreChange[]): readonly DatedReading[] {
  const [first] = changes;
  return first === undefined ? [] : [first.from, ...changes.map(({ to }) => to)].filter(isDated);
}

/** What `value` gives at the end of each day of the log, oldest day first; `undo` steps back. */
export function pastDays<Value>(
  changes: readonly ScoreChange[],
  dayOf: DayOf,
  value: (at: string) => Value,
  undo: (change: ScoreChange) => void,
): readonly DayPoint<Value>[] {
  const days: { readonly day: string; at: string; readonly rows: ScoreChange[] }[] = [];
  const rows = changes.flatMap((change) =>
    change.to.fetchedAt === null ? [] : [{ change, at: change.to.fetchedAt }],
  );
  // ISO times, so the words sort as the times do.
  for (const { change, at } of rows.sort((left, right) => (left.at < right.at ? -1 : 1))) {
    const day = dayOf(at);
    const last = days.at(-1);
    if (last?.day === day) {
      last.at = at;
      last.rows.push(change);
    } else {
      days.push({ day, at, rows: [change] });
    }
  }
  const points: DayPoint<Value>[] = [];
  for (const { at, rows: ofTheDay } of [...days].reverse()) {
    points.push({ at, value: value(at) });
    [...ofTheDay].reverse().forEach(undo);
  }
  const before = firstReadBefore(changes);
  const firstDay = days[0]?.day;
  if (before !== null && firstDay !== undefined && dayOf(before) < firstDay) {
    points.push({ at: before, value: value(before) });
  }
  return points.reverse();
}

/** The earliest reading the rows replaced: the read the log's first day compares with. */
function firstReadBefore(changes: readonly ScoreChange[]): string | null {
  let first: string | null = null;
  for (const { from } of changes) {
    if (from.fetchedAt !== null && (first === null || from.fetchedAt < first)) {
      first = from.fetchedAt;
    }
  }
  return first;
}

/** The charts' plays added up, at the end of each day of the log. */
export function playsOverTime(
  charts: readonly (Chart & { readonly stageCount: number | null })[],
  changes: readonly ScoreChange[],
  dayOf: DayOf,
): readonly DayPoint<number>[] {
  const counted = new Set(charts.map(chartKey));
  let plays = charts.reduce((sum, chart) => sum + (chart.stageCount ?? 0), 0);
  return pastDays(
    changes.filter((change) => counted.has(chartKey(change))),
    dayOf,
    () => plays,
    ({ from, to }) => {
      plays -= (to.stageCount ?? 0) - (from.stageCount ?? 0);
    },
  );
}

/** A tried chart's score rank, "none" where it has none yet. */
export type TriedRank = ScoreRank | "none";

/** How many of the charts tried hold each score rank, at the end of each day of the log. */
export function ranksOverTime(
  charts: readonly (Chart & {
    readonly crown: CrownState;
    readonly scoreRank: ScoreRank | null;
  })[],
  changes: readonly ScoreChange[],
  dayOf: DayOf,
): readonly DayPoint<Readonly<Record<TriedRank, number>>>[] {
  const ranks = new Map<string, TriedRank | null>(
    charts.map((chart) => [
      chartKey(chart),
      chart.crown === "none" ? null : (chart.scoreRank ?? "none"),
    ]),
  );
  const counts: Record<TriedRank, number> = { none: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
  for (const rank of ranks.values()) {
    if (rank !== null) {
      counts[rank] += 1;
    }
  }
  return pastDays(
    changes.filter((change) => ranks.has(chartKey(change))),
    dayOf,
    () => ({ ...counts }),
    (change) => {
      const key = chartKey(change);
      const now = ranks.get(key) ?? null;
      const { highScore, scoreRank } = change.from;
      const was = highScore === null ? null : (scoreRank ?? "none");
      if (now !== null) {
        counts[now] -= 1;
      }
      if (was !== null) {
        counts[was] += 1;
      }
      ranks.set(key, was);
    },
  );
}

/** How many of the charts hold each crown, at the end of each day of the log. */
export function crownsOverTime(
  charts: readonly (Chart & { readonly crown: CrownState })[],
  changes: readonly ScoreChange[],
  dayOf: DayOf,
): readonly DayPoint<Readonly<Record<CrownState, number>>>[] {
  const crowns = new Map(charts.map((chart) => [chartKey(chart), chart.crown]));
  const counts: Record<CrownState, number> = {
    none: 0,
    played: 0,
    silver: 0,
    gold: 0,
    donderful: 0,
  };
  for (const crown of crowns.values()) {
    counts[crown] += 1;
  }
  return pastDays(
    changes.filter((change) => crowns.has(chartKey(change))),
    dayOf,
    () => ({ ...counts }),
    (change) => {
      const key = chartKey(change);
      const now = crowns.get(key) ?? "none";
      const was = crownBefore(change);
      counts[now] -= 1;
      counts[was] += 1;
      crowns.set(key, was);
    },
  );
}
