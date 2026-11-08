import { isLevel, isObject, isSongNo } from "../guards";
import { chartKey } from "../scores/book";
import type { ScoreChange } from "../scores/changes";
import { type DayOf, pastDays } from "../scores/history";
import { COUNTED } from "./ourtaiko-formulas";
import { type RatingData, ratePlayer } from "./rating-data";
import type { ChartRating, PlayerFigure, PlayerRating, RatedScore, RatingSystem } from "./types";

/** The changes of one rating system kept for a player, at most. */
export const MAX_RATING_SNAPSHOTS = 100;

/** A chart's notes share about a million points: how far a score tells an accuracy. */
const FULL_SCORE = 1_000_000;

/** A rating as it stood: its figures, and the charts behind them. */
export interface RatingSnapshot {
  readonly at: string;
  readonly figures: readonly PlayerFigure[];
  /** The charts that count, then as many after them that could join, the highest first. */
  readonly charts: readonly ChartRating[];
}

/** A rating worked out for a past day from the log of changes, by today's constants. */
export interface PastRating {
  readonly at: string;
  readonly rating: PlayerRating;
  /** Some chart's hits were not logged then, and come from the difference in its score. */
  readonly estimated: boolean;
}

export const snapshotOf = ({ figures, charts }: PlayerRating, at: string): RatingSnapshot => ({
  at,
  figures,
  charts: charts.slice(0, 2 * COUNTED),
});

const whatItSays = ({ figures, charts }: RatingSnapshot): string =>
  JSON.stringify([
    figures.map(({ figure, value }) => [figure, value]),
    charts.map(({ songNo, level, figures: chart }) => [songNo, level, chart.rating]),
  ]);

/** The snapshots with a new one, unless the rating has not moved; the oldest past `max` go. */
export function withSnapshot(
  kept: readonly RatingSnapshot[],
  snapshot: RatingSnapshot,
  max = MAX_RATING_SNAPSHOTS,
): readonly RatingSnapshot[] {
  const last = kept.at(-1);
  return last !== undefined && whatItSays(last) === whatItSays(snapshot)
    ? kept
    : [...kept, snapshot].slice(-max);
}

function undone(score: RatedScore, { from }: ScoreChange): RatedScore {
  const { record } = score;
  if (from.highScore === null || record === null) {
    return { ...score, crown: "none", record: null };
  }
  const notes = record.good + record.ok + record.bad;
  const good = record.good - ((record.highScore - from.highScore) * notes) / FULL_SCORE;
  return {
    ...score,
    crown: from.crown,
    record: {
      ...record,
      highScore: from.highScore,
      good: from.good ?? good,
      ok: from.ok ?? record.ok,
      bad: from.bad ?? record.bad,
      drumroll: from.drumroll ?? record.drumroll,
      maxCombo: from.maxCombo ?? record.maxCombo,
      stageCount: from.stageCount,
      clearCount: from.clearCount,
      fullComboCount: from.fullComboCount,
      donderfulComboCount: from.donderfulComboCount,
    },
  };
}

/** The rating on each day of the log before `before`'s, stepping back from today's scores. */
export function pastRatings(
  scores: readonly RatedScore[],
  changes: readonly ScoreChange[],
  data: RatingData,
  dayOf: DayOf,
  before: string | null,
): readonly PastRating[] {
  const state = new Map(scores.map((score) => [chartKey(score), score]));
  const firstKept = before === null ? null : dayOf(before);
  let estimated = false;
  const days = pastDays(
    changes,
    dayOf,
    (at): PastRating | null =>
      firstKept !== null && dayOf(at) >= firstKept
        ? null
        : { at, rating: ratePlayer([...state.values()], data), estimated },
    (change) => {
      const score = state.get(chartKey(change));
      if (score === undefined) {
        return;
      }
      const { from, to } = change;
      estimated ||=
        from.highScore !== null && from.good === null && from.highScore !== to.highScore;
      state.set(chartKey(change), undone(score, change));
    },
  );
  return days.flatMap(({ value }) => (value === null ? [] : [value]));
}

/** One player's kept ratings, oldest first, for each rating system. */
export type RatingHistory = Readonly<Record<RatingSystem, readonly RatingSnapshot[]>>;

export const NO_RATING_HISTORY: RatingHistory = { ourtaikoV1: [], ourtaikoV2: [] };

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function figureOf(value: unknown): PlayerFigure[] {
  return isObject(value) && typeof value.figure === "string" && isNumber(value.value)
    ? [
        {
          figure: value.figure as PlayerFigure["figure"],
          value: value.value,
          compensated: value.compensated === true,
        },
      ]
    : [];
}

function chartOf(value: unknown): ChartRating[] {
  if (
    !isObject(value) ||
    !isSongNo(value.songNo) ||
    !isLevel(value.level) ||
    !isNumber(value.accuracy) ||
    !isNumber(value.constant) ||
    !isObject(value.figures) ||
    !isNumber(value.figures.rating) ||
    !Object.values(value.figures).every(isNumber)
  ) {
    return [];
  }
  return [
    {
      songNo: value.songNo,
      level: value.level,
      accuracy: value.accuracy,
      constant: value.constant,
      figures: value.figures as ChartRating["figures"],
    },
  ];
}

function snapshotsOf(value: unknown): RatingSnapshot[] {
  return (Array.isArray(value) ? value : []).flatMap((snapshot): RatingSnapshot[] =>
    isObject(snapshot) &&
    typeof snapshot.at === "string" &&
    Array.isArray(snapshot.figures) &&
    Array.isArray(snapshot.charts)
      ? [
          {
            at: snapshot.at,
            figures: snapshot.figures.flatMap(figureOf),
            charts: snapshot.charts.flatMap(chartOf),
          },
        ]
      : [],
  );
}

/** A kept history's well-formed snapshots; what does not read as a history at all is none. */
export function readStoredRatingHistory(stored: unknown): RatingHistory | null {
  return isObject(stored)
    ? { ourtaikoV1: snapshotsOf(stored.ourtaikoV1), ourtaikoV2: snapshotsOf(stored.ourtaikoV2) }
    : null;
}
