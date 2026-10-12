import {
  type ChartReading,
  type CrownState,
  capChanges,
  type ScoreChange,
  type ScoreChangeLog,
} from "@abth/core";

import { CROWNS, isLevel, isObject, isRank } from "./recent-plays-store";
import { isSongNo, isWholeNumber } from "./scores-store";

/** One player's log of what reads of scores changed; null where none is kept. */
export interface ScoreChangesStore {
  load(taikoNo: string): Promise<ScoreChangeLog | null>;
  save(taikoNo: string, log: ScoreChangeLog): Promise<void>;
}

const NUMBERS = [
  "highScore",
  "stageCount",
  "clearCount",
  "fullComboCount",
  "donderfulComboCount",
] as const;

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

export function createMemoryScoreChangesStore(): ScoreChangesStore {
  const players = new Map<string, ScoreChangeLog>();
  return {
    async load(taikoNo) {
      return players.get(taikoNo) ?? null;
    },
    async save(taikoNo, log) {
      players.set(taikoNo, log);
    },
  };
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
    !NUMBERS.every((name) => value[name] === null || isWholeNumber(value[name]))
  ) {
    return null;
  }
  const number = (name: (typeof NUMBERS)[number]) => value[name] as number | null;
  return {
    crown: value.crown as CrownState,
    scoreRank: value.scoreRank,
    highScore: number("highScore"),
    stageCount: number("stageCount"),
    clearCount: number("clearCount"),
    fullComboCount: number("fullComboCount"),
    donderfulComboCount: number("donderfulComboCount"),
    fetchedAt: value.fetchedAt as string | null,
  };
}
