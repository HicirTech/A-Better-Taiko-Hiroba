import type { Genre } from "@abth/core";

import { type CatalogueSong, DIFFICULTIES, type Difficulty } from "../song-catalogue/types";

/** What the picker narrows its songs to; null leaves that part open. */
export interface SongFilter {
  readonly genre: Genre | null;
  readonly difficulty: Difficulty | null;
  readonly level: number | null;
}

export const NO_FILTER: SongFilter = { genre: null, difficulty: null, level: null };

/** A level alone takes a chart of any difficulty; a difficulty alone, its chart at any level. */
function hasChart(
  levels: CatalogueSong["levels"],
  difficulty: Difficulty | null,
  level: number | null,
): boolean {
  if (difficulty === null) {
    return level === null || DIFFICULTIES.some((chart) => levels[chart] === level);
  }

  return level === null ? levels[difficulty] !== null : levels[difficulty] === level;
}

/** Whether these charts meet the difficulty and star filters. Genre is the song's. */
export function matchesCharts(
  levels: Readonly<Record<Difficulty, number | null>>,
  { difficulty, level }: SongFilter,
): boolean {
  return hasChart(levels, difficulty, level);
}

export function matchesFilter(
  song: CatalogueSong,
  { genre, difficulty, level }: SongFilter,
): boolean {
  return (
    (genre === null || song.genres.includes(genre)) && hasChart(song.levels, difficulty, level)
  );
}
