/** The catalogue side: songs and their playable charts, independent of any player. */
import type { Genre, Level } from "./vocabulary";

/**
 * One song in the catalogue. A song can surface in more than one genre list; entries are
 * de-duplicated by `songNo` and the genres accumulate.
 */
export interface Song {
  readonly songNo: string;
  readonly title: string;
  readonly genres: readonly Genre[];
}

/** The playable unit: a song at a difficulty. */
export interface Chart {
  readonly songNo: string;
  readonly level: Level;
}
