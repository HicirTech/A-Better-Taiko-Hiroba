import type { ShownDifficulty } from "../favorites/shown-difficulty";
import { DIFFICULTIES, type Difficulty, type SongBpm } from "../song-catalogue/types";

/** "154", "120–240", or "≈168" for a tempo that wobbles: the numbers as taiko.wiki gives them. */
export function bpmText({ min, max, wobbles }: SongBpm): string {
  const range = min === max ? `${min}` : `${min}–${max}`;
  return wobbles ? `≈${range}` : range;
}

/** The chart a song's details open on: the shown difficulty's, and the inner one for Extreme. */
export function openingChart(
  levels: Readonly<Record<Difficulty, number | null>>,
  shown: ShownDifficulty,
): Difficulty | null {
  if (shown === "oni" && levels.ura !== null) {
    return "ura";
  }

  if (levels[shown] !== null) {
    return shown;
  }

  return [...DIFFICULTIES].reverse().find((difficulty) => levels[difficulty] !== null) ?? null;
}
