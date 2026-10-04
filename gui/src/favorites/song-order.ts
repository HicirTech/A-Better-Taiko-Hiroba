import type { Genre } from "@abth/core";

import type { CatalogueSong } from "../song-catalogue/types";

/** Orders the highest song number first: the newest song. */
export const newestFirst = (a: Pick<CatalogueSong, "songNo">, b: Pick<CatalogueSong, "songNo">) =>
  Number(b.songNo) - Number(a.songNo);

/** The songs of each genre, newest first; a song with several genres is in each of them. */
export function songsByGenre(
  songs: readonly CatalogueSong[],
): ReadonlyMap<Genre, readonly CatalogueSong[]> {
  const byGenre = new Map<Genre, CatalogueSong[]>();
  for (const song of [...songs].sort(newestFirst)) {
    for (const genre of song.genres) {
      const listed = byGenre.get(genre);
      if (listed === undefined) {
        byGenre.set(genre, [song]);
      } else {
        listed.push(song);
      }
    }
  }
  return byGenre;
}
