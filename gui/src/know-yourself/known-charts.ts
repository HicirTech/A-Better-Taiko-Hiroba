import { CROWN_ORDER, type CrownState, type Level, type ScoreRank } from "@abth/core";

import { LEVEL_DIFFICULTY } from "../favorites/genre-look";
import { type ShownDifficulty, shownFor } from "../favorites/shown-difficulty";
import type { ChartHits, ListedChartsView } from "../session-port";
import type { CatalogueSong, Difficulty, SongBpm } from "../song-catalogue/types";

/** A chart the lists name, with what taiko.wiki's song list says of it. */
export interface KnownChart {
  readonly songNo: string;
  readonly level: Level;
  readonly difficulty: Difficulty;
  readonly crown: CrownState;
  readonly scoreRank: ScoreRank | null;
  readonly hits: ChartHits | null;
  /** None where taiko.wiki has no star level for the chart. */
  readonly stars: number | null;
  readonly hitsPerSecond: number | null;
  readonly bpm: SongBpm | null;
}

// Hiroba marks a double-play song only in its title: such songs count for neither shares nor sets.
export const isDoublePlay = (title: string): boolean => title.startsWith("【双打】");

/** The charts of the lists, but those of double-play songs, joined to taiko.wiki by song number. */
export function knownCharts(
  listed: ListedChartsView,
  songs: ReadonlyMap<string, CatalogueSong>,
): readonly KnownChart[] {
  const doubles = new Set(
    listed.songs.filter(({ title }) => isDoublePlay(title)).map(({ songNo }) => songNo),
  );
  return listed.charts.flatMap(({ songNo, level, crown, scoreRank, hits }): KnownChart[] => {
    if (doubles.has(songNo)) {
      return [];
    }
    const difficulty = LEVEL_DIFFICULTY[level];
    const song = songs.get(songNo);
    const facts = song?.charts[difficulty] ?? null;
    const notes = facts?.maxCombo ?? null;
    const seconds = facts?.playTime ?? null;
    return [
      {
        songNo,
        level,
        difficulty,
        crown,
        scoreRank,
        hits,
        stars: song?.levels[difficulty] ?? null,
        hitsPerSecond: notes === null || seconds === null || seconds <= 0 ? null : notes / seconds,
        bpm: song?.bpm ?? null,
      },
    ];
  });
}

/** The charts of a difficulty as Settings name it: Extreme holds the Oni and the Ura charts. */
export const shownAt = (charts: readonly KnownChart[], shown: ShownDifficulty) =>
  charts.filter(({ difficulty }) => shownFor(difficulty) === shown);

export const isTried = ({ crown }: KnownChart): boolean => crown !== "none";

export const isCleared = ({ crown }: KnownChart): boolean =>
  CROWN_ORDER[crown] >= CROWN_ORDER.silver;
