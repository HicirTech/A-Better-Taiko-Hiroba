import type { Song } from "./song";
import type { Genre } from "./vocabulary";

/** Three ordinary outcomes, not failures, hence its own type rather than a `Result`. */
export type SongResolution = ResolvedSong | AmbiguousTitle | UnknownTitle;

export interface ResolvedSong {
  readonly outcome: "resolved";
  readonly songNo: string;
}

export interface AmbiguousTitle {
  readonly outcome: "ambiguous";
  /** Every song carrying the title, in catalogue order. Always two or more. */
  readonly candidates: readonly string[];
}

/** No song in the catalogue carries the title — ordinarily a song added since the last read. */
export interface UnknownTitle {
  readonly outcome: "unknown";
}

/** Resolves a played title to a song number; never guesses: a wrong chart is worse than none. */
export function resolveSongTitle(
  catalogue: readonly Song[],
  title: string,
  genre: Genre | null,
): SongResolution {
  // Stored scores are not consulted: resolution stays reproducible from the catalogue alone.
  const candidates = catalogue.filter((song) => song.title === title);
  if (candidates.length === 0) {
    return { outcome: "unknown" };
  }

  const only = single(candidates);
  if (only !== null) {
    return { outcome: "resolved", songNo: only.songNo };
  }

  if (genre !== null) {
    const inGenre = single(candidates.filter((song) => song.genres.includes(genre)));
    if (inGenre !== null) {
      return { outcome: "resolved", songNo: inGenre.songNo };
    }
  }
  return { outcome: "ambiguous", candidates: candidates.map((song) => song.songNo) };
}

function single(songs: readonly Song[]): Song | null {
  return songs.length === 1 ? (songs[0] ?? null) : null;
}
