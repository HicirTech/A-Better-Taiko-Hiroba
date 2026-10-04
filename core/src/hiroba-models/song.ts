import type { Genre, Level } from "./vocabulary";

/** One song; it can appear in several genre lists, so entries are de-duplicated by `songNo`. */
export interface Song {
  readonly songNo: string;
  readonly title: string;
  readonly genres: readonly Genre[];
}

export interface Chart {
  readonly songNo: string;
  readonly level: Level;
}

/** Folds one freshly read genre into the catalogue; authoritative for that genre only. */
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

  // Ascending order makes the result independent of the order the genres were fetched in.
  return [...merged.values()].sort((a, b) => Number(a.songNo) - Number(b.songNo));
}

export interface GenreReading {
  readonly genre: Genre;
  readonly songs: readonly Song[];
}

/** Folds in any number of genre readings; all eight into an empty catalogue builds it whole. */
export function updateCatalogue(
  known: readonly Song[],
  readings: readonly GenreReading[],
): readonly Song[] {
  // Order does not matter: the site renders one title per song number. On a clash the later wins.
  let catalogue = known;
  for (const reading of readings) {
    catalogue = mergeGenreIntoCatalogue(catalogue, reading.genre, reading.songs);
  }
  return catalogue;
}

function sortedGenres(genres: readonly Genre[]): readonly Genre[] {
  return [...new Set(genres)].sort((a, b) => a - b);
}

function sameGenres(a: readonly Genre[], b: readonly Genre[]): boolean {
  return a.length === b.length && a.every((genre, index) => genre === b[index]);
}
