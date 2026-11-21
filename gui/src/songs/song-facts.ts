import { DIFFICULTIES, type Difficulty, type SongBpm } from "@abth/core";
import type { ShownDifficulty } from "../shared/song-catalogue/shown-difficulty";

/** "154", "120–240", or "≈168" for a tempo that wobbles: the numbers as taiko.wiki gives them. */
export function bpmText({ min, max, wobbles }: SongBpm): string {
  const range = min === max ? `${min}` : `${min}–${max}`;
  return wobbles ? `≈${range}` : range;
}

/** The chart details open on: one asked for, else the shown difficulty's; Extreme's inner first. */
export function openingChart(
  levels: Readonly<Record<Difficulty, number | null>>,
  shown: ShownDifficulty,
  asked: Difficulty | null = null,
): Difficulty | null {
  if (asked !== null && levels[asked] !== null) {
    return asked;
  }

  if (shown === "oni" && levels.ura !== null) {
    return "ura";
  }

  if (levels[shown] !== null) {
    return shown;
  }

  return [...DIFFICULTIES].reverse().find((difficulty) => levels[difficulty] !== null) ?? null;
}
