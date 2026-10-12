import {
  type Chart,
  CROWN_ORDER,
  type CrownState,
  type Score,
  type ScoreRank,
} from "../hiroba-models";
import { chartKey, replaces, type ScoreBook } from "./book";

/** Rows a player's log holds at most, the milestones aside. */
export const MAX_SCORE_CHANGES = 5000;

/** What one reading told of a chart; the numbers are null for a reading without its details. */
export interface ChartReading {
  readonly crown: CrownState;
  readonly scoreRank: ScoreRank | null;
  readonly highScore: number | null;
  readonly stageCount: number | null;
  readonly clearCount: number | null;
  readonly fullComboCount: number | null;
  readonly donderfulComboCount: number | null;
  /** When the app read it; null where the book held no reading of the chart. */
  readonly fetchedAt: string | null;
}

/** A chart whose kept reading a read replaced with a different one. */
export interface ScoreChange extends Chart {
  readonly from: ChartReading;
  readonly to: ChartReading;
}

/** One player's changes, oldest first; none are kept until a first full read has ended. */
export interface ScoreChangeLog {
  readonly baselined: boolean;
  readonly changes: readonly ScoreChange[];
}

/** What a change is about: a move in the place, sections or hit counts alone is none. */
const COMPARED = [
  "crown",
  "scoreRank",
  "highScore",
  "stageCount",
  "clearCount",
  "fullComboCount",
  "donderfulComboCount",
] as const;

function readingOf(score: Score | undefined): ChartReading {
  const record = score?.record ?? null;
  return {
    crown: score?.crown ?? "none",
    scoreRank: score?.scoreRank ?? null,
    highScore: record?.highScore ?? null,
    stageCount: record?.stageCount ?? null,
    clearCount: record?.clearCount ?? null,
    fullComboCount: record?.fullComboCount ?? null,
    donderfulComboCount: record?.donderfulComboCount ?? null,
    fetchedAt: score?.fetchedAt ?? null,
  };
}

/** How a detailed reading differs from the kept one; null where it does not, or cannot replace. */
export function changeOf(kept: Score | undefined, score: Score): ScoreChange | null {
  if (score.record === null || !replaces(kept, score)) {
    return null;
  }
  const from = readingOf(kept);
  const to = readingOf(score);
  return COMPARED.some((field) => from[field] !== to[field])
    ? { songNo: score.songNo, level: score.level, from, to }
    : null;
}

/** A chart's first clear, full combo or donderful: rows the cap never takes. */
export function isMilestone({ from, to }: ScoreChange): boolean {
  // A list read in the same read may show the new crown already: a reading without details is none.
  const was = from.highScore === null ? CROWN_ORDER.none : CROWN_ORDER[from.crown];
  return CROWN_ORDER[to.crown] > was && CROWN_ORDER[to.crown] >= CROWN_ORDER.silver;
}

/** At most `max` rows besides the milestones: the oldest other rows go first. */
export function capChanges(
  changes: readonly ScoreChange[],
  max = MAX_SCORE_CHANGES,
): readonly ScoreChange[] {
  let excess = changes.length - max;
  if (excess <= 0) {
    return changes;
  }
  return changes.filter((change) => {
    if (excess > 0 && !isMilestone(change)) {
      excess -= 1;
      return false;
    }
    return true;
  });
}

/** The log with what `score` changes in `book`, the book before the score is folded in. */
export function logDetail(log: ScoreChangeLog, book: ScoreBook, score: Score): ScoreChangeLog {
  if (!log.baselined) {
    return log;
  }
  const change = changeOf(book.scores[chartKey(score)], score);
  return change === null ? log : { ...log, changes: capChanges([...log.changes, change]) };
}

/** A first log for a book: one that holds details already is past its first full read. */
export function startingLog(book: ScoreBook): ScoreChangeLog {
  return {
    baselined: Object.values(book.scores).some(({ record }) => record !== null),
    changes: [],
  };
}

/** The log once a full read has ended: what reads change from then on is kept. */
export function withBaseline(log: ScoreChangeLog): ScoreChangeLog {
  return log.baselined ? log : { ...log, baselined: true };
}
