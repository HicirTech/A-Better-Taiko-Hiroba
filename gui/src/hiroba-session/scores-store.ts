import {
  type CrownState,
  chartKey,
  EMPTY_SCORE_BOOK,
  type Genre,
  type Score,
  type ScoreBook,
  type ScoreFidelity,
  type Song,
  type UnlistedPlay,
} from "@abth/core";

import { CROWNS, isGenre, isLevel, isObject, isRank, recordOf } from "./recent-plays-store";

/** One player's score book. A missing one reads as a book never read. */
export interface ScoresStore {
  load(taikoNo: string): Promise<ScoreBook>;
  save(taikoNo: string, book: ScoreBook): Promise<void>;
}

const FIDELITIES = new Set<ScoreFidelity>(["list", "detail", "recent"]);
const SONG_NO = /^\d{1,5}$/;

/** A kept book's well-formed parts. A broken book reads as one never read, not a crash. */
export function readStoredScoreBook(stored: unknown): ScoreBook {
  if (
    !isObject(stored) ||
    !Array.isArray(stored.songs) ||
    !isObject(stored.scores) ||
    !Array.isArray(stored.stale) ||
    !Array.isArray(stored.unlisted) ||
    typeof stored.full !== "boolean"
  ) {
    return EMPTY_SCORE_BOOK;
  }
  const scores = Object.fromEntries(
    Object.values(stored.scores)
      .flatMap(scoreOf)
      .map((score) => [chartKey(score), score]),
  );
  return {
    songs: stored.songs.flatMap(songOf),
    scores,
    stale: stored.stale.filter(
      (key): key is string => typeof key === "string" && Object.hasOwn(scores, key),
    ),
    unlisted: stored.unlisted.flatMap(unlistedOf),
    full: stored.full,
  };
}

export function createMemoryScoresStore(): ScoresStore {
  const players = new Map<string, ScoreBook>();
  return {
    async load(taikoNo) {
      return players.get(taikoNo) ?? EMPTY_SCORE_BOOK;
    },
    async save(taikoNo, book) {
      players.set(taikoNo, book);
    },
  };
}

function songOf(value: unknown): Song[] {
  if (
    !isObject(value) ||
    !isSongNo(value.songNo) ||
    typeof value.title !== "string" ||
    !Array.isArray(value.genres) ||
    !value.genres.every(isListedGenre)
  ) {
    return [];
  }
  return [{ songNo: value.songNo, title: value.title, genres: value.genres }];
}

function scoreOf(value: unknown): Score[] {
  if (
    !isObject(value) ||
    typeof value.taikoNo !== "string" ||
    !isSongNo(value.songNo) ||
    !isLevel(value.level) ||
    !CROWNS.has(value.crown as CrownState) ||
    !isRank(value.scoreRank) ||
    !FIDELITIES.has(value.fidelity as ScoreFidelity) ||
    typeof value.fetchedAt !== "string"
  ) {
    return [];
  }
  const record = value.record === null ? null : recordOf(value.record);
  if (value.record !== null && record === null) {
    return [];
  }
  return [
    {
      taikoNo: value.taikoNo,
      songNo: value.songNo,
      level: value.level,
      crown: value.crown as CrownState,
      scoreRank: value.scoreRank,
      fidelity: value.fidelity as ScoreFidelity,
      record,
      fetchedAt: value.fetchedAt,
    },
  ];
}

function unlistedOf(value: unknown): UnlistedPlay[] {
  if (
    !isObject(value) ||
    typeof value.songTitle !== "string" ||
    !isListedGenre(value.genre) ||
    !isLevel(value.level)
  ) {
    return [];
  }
  return [{ songTitle: value.songTitle, genre: value.genre, level: value.level }];
}

function isSongNo(value: unknown): value is string {
  return typeof value === "string" && SONG_NO.test(value);
}

function isListedGenre(value: unknown): value is Genre {
  return value !== null && isGenre(value);
}
