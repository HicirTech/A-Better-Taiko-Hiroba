import { type RecentPlay, resolveSongTitle, type Song, type SongResolution } from "@abth/core";

import type { CatalogueSong } from "../shared/song-catalogue/types";

// taiko.wiki tells a cover Hiroba titles as its original by a bracketed end: 濃紅(にじさんじ).
const BRACKETED_END = /\s*[(（][^()（）]*[)）]\s*$/;

/** taiko.wiki's songs by title, each one also under its title without a bracketed end. */
export type SongsByTitle = ReadonlyMap<string, readonly CatalogueSong[]>;

export function songsByTitle(songs: Iterable<CatalogueSong>): SongsByTitle {
  const byTitle = new Map<string, CatalogueSong[]>();
  for (const song of songs) {
    for (const title of new Set([song.title, song.title.replace(BRACKETED_END, "")])) {
      byTitle.set(title, [...(byTitle.get(title) ?? []), song]);
    }
  }
  return byTitle;
}

/** The song a recent play names: by Hiroba's titles in the lists first, then by taiko.wiki's. */
export function playedSong(
  byTitle: SongsByTitle,
  play: Pick<RecentPlay, "songTitle" | "genre">,
  listed: readonly Song[],
): SongResolution {
  const found = resolveSongTitle(listed, play.songTitle, play.genre);
  if (found.outcome !== "unknown") {
    return found;
  }
  const named = (byTitle.get(play.songTitle) ?? []).map(({ songNo, genres }) => ({
    songNo,
    title: play.songTitle,
    genres,
  }));
  return resolveSongTitle(named, play.songTitle, play.genre);
}
