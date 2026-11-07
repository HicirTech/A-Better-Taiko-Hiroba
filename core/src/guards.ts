import type { Genre, Level, ScoreRank } from "./hiroba-models";

const SONG_NO = /^\d{1,5}$/;

/** Any object but null, arrays too. */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** An object that is neither null nor an array. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A whole number, zero or more. */
export function isWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** A song number as Hiroba writes it: one to five digits. */
export function isSongNo(value: unknown): value is string {
  return typeof value === "string" && SONG_NO.test(value);
}

/** A chart's difficulty, from 1 (Easy) to 5 (Ura). */
export function isLevel(value: unknown): value is Level {
  return typeof value === "number" && value >= 1 && value <= 5;
}

/** A score rank, or null for a chart that has none. */
export function isRank(value: unknown): value is ScoreRank | null {
  return value === null || (typeof value === "number" && value >= 2 && value <= 8);
}

/** A genre, or null for a song that has none. */
export function isGenre(value: unknown): value is Genre | null {
  return value === null || (typeof value === "number" && value >= 1 && value <= 8);
}
