import {
  type CrownState,
  chartKey,
  type Genre,
  isGenre,
  isLevel,
  isObject,
  isRank,
  isSongNo,
  isWholeNumber,
  type Score,
  type ScoreBook,
  type ScoreFidelity,
  type ScoreSection,
  type Song,
  type UnlistedPlay,
} from "@abth/core";

import { CROWNS, recordOf } from "./recent-plays-store";

const FIDELITIES = new Set<ScoreFidelity>(["list", "detail", "recent"]);

interface StoredBook {
  readonly songs: readonly unknown[];
  readonly scores: Record<string, unknown>;
  readonly stale: readonly unknown[];
  readonly unlisted: readonly unknown[];
  readonly full: boolean;
}

/** Whether a kept book has a book's shape, whatever its parts hold. */
function isStoredScoreBook(stored: unknown): stored is StoredBook {
  return (
    isObject(stored) &&
    Array.isArray(stored.songs) &&
    isObject(stored.scores) &&
    Array.isArray(stored.stale) &&
    Array.isArray(stored.unlisted) &&
    typeof stored.full === "boolean"
  );
}

/** A kept book's well-formed parts; what does not have a book's shape is none. */
export function readStoredScoreBook(stored: unknown): ScoreBook | null {
  if (!isStoredScoreBook(stored)) {
    return null;
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
  // A book kept before the ranking and the sections were read has neither: they read as none.
  const sections = Array.isArray(value.sections) ? value.sections.flatMap(sectionOf) : [];
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
      ranking: isWholeNumber(value.ranking) ? value.ranking : null,
      sections,
    },
  ];
}

function sectionOf(value: unknown): ScoreSection[] {
  if (!isObject(value) || !CROWNS.has(value.crown as CrownState)) {
    return [];
  }
  const { score, good, ok, bad, drumroll } = value;
  const counts = [score, good, ok, bad, drumroll];
  if (!counts.every(isWholeNumber)) {
    return [];
  }
  return [
    {
      crown: value.crown as CrownState,
      score: score as number,
      good: good as number,
      ok: ok as number,
      bad: bad as number,
      drumroll: drumroll as number,
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

function isListedGenre(value: unknown): value is Genre {
  return value !== null && isGenre(value);
}
