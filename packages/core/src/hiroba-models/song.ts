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

/**
 * Folds one freshly read genre into the catalogue already held.
 *
 * The catalogue is not imported once: Namco adds songs and retires them, so every genre is read
 * again from time to time and the two readings have to be reconciled. Identity is the song number,
 * and a song that appears in several genres stays one Song whose genres accumulate. Ura never
 * reaches here as a song of its own — it shares its song's number.
 *
 * Reading a genre is authoritative **for that genre only**: a known song that this genre no longer
 * lists loses that genre, and loses its place in the catalogue when it belonged to no other. A
 * genre page has no pagination, so a complete parse is a complete genre; a failed one is a failure
 * and never reaches this function.
 *
 * A song that did not change is returned as the same object, so a caller can tell what actually
 * moved without comparing fields. Songs and genres both come back in ascending numeric order,
 * which is what makes the result independent of the order the genres were fetched in. Where two
 * readings disagree about a title, the fresher one wins.
 */
export function mergeGenreIntoCatalogue(
  known: readonly Song[],
  genre: Genre,
  fetched: readonly Song[],
): readonly Song[] {
  const merged = new Map<string, Song>();

  for (const song of known) {
    const stillListed = fetched.some((candidate) => candidate.songNo === song.songNo);
    if (song.genres.includes(genre) && !stillListed) {
      const remaining = song.genres.filter((each) => each !== genre);
      if (remaining.length > 0) {
        merged.set(song.songNo, { ...song, genres: remaining });
      }
      continue;
    }
    merged.set(song.songNo, song);
  }

  for (const song of fetched) {
    const current = merged.get(song.songNo);
    if (current === undefined) {
      merged.set(song.songNo, { ...song, genres: sortedGenres(song.genres) });
      continue;
    }
    const genres = sortedGenres([...current.genres, ...song.genres]);
    if (current.title === song.title && sameGenres(current.genres, genres)) {
      continue; // unchanged: keep the object the caller already has
    }
    merged.set(song.songNo, { songNo: song.songNo, title: song.title, genres });
  }

  return [...merged.values()].sort((a, b) => Number(a.songNo) - Number(b.songNo));
}

function sortedGenres(genres: readonly Genre[]): readonly Genre[] {
  return [...new Set(genres)].sort((a, b) => a - b);
}

function sameGenres(a: readonly Genre[], b: readonly Genre[]): boolean {
  return a.length === b.length && a.every((genre, index) => genre === b[index]);
}
