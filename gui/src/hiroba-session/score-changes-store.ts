import {
  type ChartReading,
  type CrownState,
  capChanges,
  isLevel,
  isObject,
  isRank,
  isSongNo,
  isWholeNumber,
  type ScoreChange,
  type ScoreChangeLog,
} from "@abth/core";

import { CROWNS } from "./recent-plays-store";

const NUMBERS = [
  "highScore",
  "stageCount",
  "clearCount",
  "fullComboCount",
  "donderfulComboCount",
] as const;
/** Absent from a row kept before they were logged. */
const HITS = ["good", "ok", "bad", "drumroll", "maxCombo"] as const;

/** A kept log's well-formed rows, capped; what does not read as a log at all is none. */
export function readStoredScoreChanges(stored: unknown): ScoreChangeLog | null {
  if (
    !isObject(stored) ||
    typeof stored.baselined !== "boolean" ||
    !Array.isArray(stored.changes)
  ) {
    return null;
  }
  return { baselined: stored.baselined, changes: capChanges(stored.changes.flatMap(changeOf)) };
}

function changeOf(value: unknown): ScoreChange[] {
  if (!isObject(value) || !isSongNo(value.songNo) || !isLevel(value.level)) {
    return [];
  }
  const from = readingOf(value.from);
  const to = readingOf(value.to);
  return from === null || to === null
    ? []
    : [{ songNo: value.songNo, level: value.level, from, to }];
}

function readingOf(value: unknown): ChartReading | null {
  if (
    !isObject(value) ||
    !CROWNS.has(value.crown as CrownState) ||
    !isRank(value.scoreRank) ||
    (value.fetchedAt !== null && typeof value.fetchedAt !== "string") ||
    !NUMBERS.every((name) => value[name] === null || isWholeNumber(value[name])) ||
    !HITS.every((name) => (value[name] ?? null) === null || isWholeNumber(value[name]))
  ) {
    return null;
  }
  const number = (name: (typeof NUMBERS)[number] | (typeof HITS)[number]) =>
    (value[name] ?? null) as number | null;
  return {
    crown: value.crown as CrownState,
    scoreRank: value.scoreRank,
    highScore: number("highScore"),
    stageCount: number("stageCount"),
    clearCount: number("clearCount"),
    fullComboCount: number("fullComboCount"),
    donderfulComboCount: number("donderfulComboCount"),
    good: number("good"),
    ok: number("ok"),
    bad: number("bad"),
    drumroll: number("drumroll"),
    maxCombo: number("maxCombo"),
    fetchedAt: value.fetchedAt as string | null,
  };
}
