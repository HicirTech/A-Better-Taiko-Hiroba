import type { Locale } from "@abth/i18n";
import { action } from "storybook/actions";

import { wikiSongsSince } from "../../scripts/mock-song-catalogue";
import { lookOfCatalogue, type SongLook } from "../favorites/song-look";
import type { ListedSong, SongCatalogue } from "../favorites/use-song-catalogue";
import { parseWikiSongs } from "../song-catalogue";
import { packData } from "./pack";

// Never asked for: a story's chart pictures come from the stand-in, not from these addresses.
const CHART_ORIGIN = "https://charts.stand-in.invalid";

function songsOf(text: string, list: string): readonly ListedSong[] {
  const read = parseWikiSongs(text);
  if (!read.ok) {
    throw new Error(`${list} does not parse`);
  }
  return read.value.songs.map((song) => ({ ...song, chineseNames: [] }));
}

/** The e2e's stand-in song list, read as the app reads taiko.wiki's. */
export const STORY_SONGS: readonly ListedSong[] = songsOf(
  JSON.stringify(wikiSongsSince(null, CHART_ORIGIN)),
  "The stand-in's song list",
);

const packSongs = packData("songCatalogue");

/** The songs a whole page reads: the resource pack's taiko.wiki list, else the stand-in's. */
export const PAGE_SONGS: readonly ListedSong[] =
  packSongs === null ? STORY_SONGS : songsOf(packSongs, "The resource pack's song list");

const BY_NUMBER: ReadonlyMap<string, ListedSong> = new Map(
  STORY_SONGS.map((song) => [song.songNo, song]),
);

export function storySong(songNo: string): ListedSong {
  const song = BY_NUMBER.get(songNo);
  if (song === undefined) {
    throw new Error(`The stand-in has no song ${songNo}`);
  }
  return song;
}

/** A song as a row draws it, in the toolbar's language. */
export const lookOf = (songNo: string, locale: Locale): SongLook =>
  lookOfCatalogue(storySong(songNo), locale);

/** The song list as the app holds it: ready, still on its way, or failed with none kept. */
export function storyCatalogue(state: SongCatalogue["state"] = "ready"): SongCatalogue {
  const list = state === "ready" ? STORY_SONGS : [];
  return {
    songs: new Map(list.map((song) => [song.songNo, song])),
    list,
    state,
    failure: state === "failed" ? "unreachable" : null,
    readIfFailed: action("read if failed"),
  };
}
