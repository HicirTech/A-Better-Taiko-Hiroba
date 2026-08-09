/** Turning a title into a song number, or admitting that it cannot be done. */
import type { Song } from "./song";
import type { Genre } from "./vocabulary";

/**
 * What a title lookup came to. Three outcomes, none of them a failure — a title that names several
 * songs and a title the catalogue has never heard of are both ordinary readings of a good page,
 * which is why this is its own type rather than a `Result`.
 */
export type SongResolution = ResolvedSong | AmbiguousTitle | UnknownTitle;

/** Exactly one song carries the title, so the play can be written against `songNo`. */
export interface ResolvedSong {
  readonly outcome: "resolved";
  readonly songNo: string;
}

/**
 * Several songs carry the title and nothing available separates them. The candidates are named so
 * a caller can report them or narrow them with a signal this function does not have.
 */
export interface AmbiguousTitle {
  readonly outcome: "ambiguous";
  /** Every song carrying the title, in catalogue order. Always two or more. */
  readonly candidates: readonly string[];
}

/** No song in the catalogue carries the title — ordinarily a song added since the last read. */
export interface UnknownTitle {
  readonly outcome: "unknown";
}

/**
 * Resolves a played title against the catalogue, declining to guess.
 *
 * `history_recent_score.php` names its songs by title and carries no song number anywhere, and the
 * title is not a key: a full eight-genre read found ten titles carried by more than one song
 * number, re-releases that also share their difficulties, so level separates nothing. Writing a
 * record onto a chart nobody played is the one unacceptable outcome; staying unresolved is not,
 * because the genre lists carry the same play by song number anyway.
 *
 * Matching is exact on the title string. The catalogue and the page are rendered from the same
 * source, so a near-match would mean the two disagree about what a song is called, and guessing
 * across that gap is exactly the guess this function refuses.
 *
 * `genre` is the row's only further signal — the suffix of the title's font class — and it may
 * narrow but never invent: it is applied to an already ambiguous set, and only a narrowing down to
 * a single song resolves. A narrowing to none means the catalogue is stale about that title's
 * genres, which is still ambiguous rather than unknown, since the title demonstrably exists. Both
 * of those return the full candidate list, not the narrowed one.
 *
 * Stored scores are deliberately not consulted. "This candidate already has a record" is evidence
 * about the past, not about which chart was just played, and reaching for it would make resolution
 * depend on sync state and stop being reproducible from the catalogue alone. Reconciling a
 * resolution against cached scores is a sync concern, above this function.
 */
export function resolveSongTitle(
  catalogue: readonly Song[],
  title: string,
  genre: Genre | null,
): SongResolution {
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

/** The one song of a set, or null when the set holds any other number of them. */
function single(songs: readonly Song[]): Song | null {
  return songs.length === 1 ? (songs[0] ?? null) : null;
}
