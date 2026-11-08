import {
  EMPTY_SCORE_BOOK,
  NO_RATING_HISTORY,
  type RatingHistory,
  type RecentPlay,
  readStoredRatingHistory,
  readStoredRecentPlays,
  readStoredScoreBook,
  readStoredScoreChanges,
  type ScoreBook,
  type ScoreChangeLog,
} from "@abth/core";

import type { CostumeHistoryEntry, FolderHistoryEntry } from "../shared/session-port";
import { readCostumeHistory } from "./costume-history";
import { readFolderHistory } from "./folder-history";

/** One kind of data kept for each player on the device, as every store of it names and reads it. */
export interface KeptThing<T, M = T> {
  /** The desktop's file in its data folder. */
  readonly file: string;
  /** Android's database, its one table, and the field of a record that holds the value. */
  readonly database: string;
  readonly table: string;
  readonly field: string;
  /** Where builds before kept it: read until the first save, and never written. */
  readonly earlier?: { readonly file: string; readonly database: string };
  /** What a player gets with nothing kept, or nothing that reads. */
  readonly missing: M;
  /** A value kept as none: the player's record is dropped. */
  readonly dropped: (value: T) => boolean;
  /** The kept value's well-formed parts; null for what does not read as one at all. */
  readonly read: (stored: unknown) => T | null;
}

/** A kind of kept data, per taiko number, as one device can hold more than one card. */
export interface KeptStore<T, M = T> {
  /** The player's value; rejects only when the store cannot be read at all. */
  load(taikoNo: string): Promise<T | M>;
  /** Keeps the player's value; rejects when it cannot be written. */
  save(taikoNo: string, value: T): Promise<void>;
}

const keptWhole = () => false;
const isEmpty = (list: readonly unknown[]) => list.length === 0;

export const KEPT_SCORES: KeptThing<ScoreBook> = {
  file: "scores.json",
  database: "abth-scores",
  table: "books",
  field: "book",
  missing: EMPTY_SCORE_BOOK,
  dropped: keptWhole,
  read: readStoredScoreBook,
};

export const KEPT_RECENT_PLAYS: KeptThing<readonly RecentPlay[]> = {
  file: "recent-plays.json",
  database: "abth-recent-plays",
  table: "plays",
  field: "plays",
  missing: [],
  dropped: isEmpty,
  read: readStoredRecentPlays,
};

export const KEPT_SCORE_CHANGES: KeptThing<ScoreChangeLog, null> = {
  file: "score-changes-2.json",
  database: "abth-score-changes-2",
  table: "changes",
  field: "log",
  // Where builds that logged no hits keep theirs.
  earlier: { file: "score-changes.json", database: "abth-score-changes" },
  missing: null,
  dropped: keptWhole,
  read: readStoredScoreChanges,
};

export const KEPT_RATING_HISTORY: KeptThing<RatingHistory> = {
  file: "rating-history.json",
  database: "abth-rating-history",
  table: "ratings",
  field: "history",
  missing: NO_RATING_HISTORY,
  dropped: keptWhole,
  read: readStoredRatingHistory,
};

// A database of its own, apart from the pictures, which an epoch bump clears.
export const KEPT_COSTUME_HISTORY: KeptThing<readonly CostumeHistoryEntry[]> = {
  file: "costume-history.json",
  database: "abth-costume-history",
  table: "histories",
  field: "entries",
  missing: [],
  dropped: isEmpty,
  read: readCostumeHistory,
};

export const KEPT_FOLDER_HISTORY: KeptThing<readonly FolderHistoryEntry[]> = {
  file: "folder-history.json",
  database: "abth-folder-history",
  table: "histories",
  field: "entries",
  missing: [],
  dropped: isEmpty,
  read: readFolderHistory,
};

export type ScoresStore = KeptStore<ScoreBook>;
export type RecentPlaysStore = KeptStore<readonly RecentPlay[]>;
/** None where no log is kept. */
export type ScoreChangesStore = KeptStore<ScoreChangeLog, null>;
export type RatingHistoryStore = KeptStore<RatingHistory>;
/** A history, newest first. */
export type HistoryStore<Entry> = KeptStore<readonly Entry[]>;
export type CostumeHistoryStore = HistoryStore<CostumeHistoryEntry>;
export type FolderHistoryStore = HistoryStore<FolderHistoryEntry>;

/** A kind of kept data held in memory, where a device has nowhere else to keep it. */
export function keptMemoryStore<T, M>(thing: KeptThing<T, M>): KeptStore<T, M> {
  const players = new Map<string, T>();
  return {
    async load(taikoNo) {
      return players.get(taikoNo) ?? thing.missing;
    },
    async save(taikoNo, value) {
      if (thing.dropped(value)) {
        players.delete(taikoNo);
      } else {
        players.set(taikoNo, value);
      }
    },
  };
}
