import type { Genre } from "@abth/core";
import type { Locale } from "@abth/i18n";

import { HIROBA_LANG } from "../language/hiroba-lang";
import type { FavoritesView, ShownSong } from "../session-port";
import type { CatalogueSong, Difficulty } from "../song-catalogue/types";
import { nameLanguage, numberedSong, shownName } from "./song-names";

/** One song as a row draws it: from the catalogue, or from Hiroba's own words when it lacks it. */
export interface SongLook {
  readonly songNo: string;
  readonly name: string;
  readonly lang: string;
  readonly artists: readonly string[];
  /** Every genre the song is in; none when neither the catalogue nor Hiroba names one. */
  readonly genres: readonly Genre[];
  /** Null for a song the catalogue lacks. */
  readonly levels: Readonly<Record<Difficulty, number | null>> | null;
}

export function lookOfCatalogue(song: CatalogueSong, locale: Locale): SongLook {
  const name = shownName(song, locale);
  return {
    songNo: song.songNo,
    name,
    lang: nameLanguage(song, name),
    artists: song.artists,
    genres: song.genres,
    levels: song.levels,
  };
}

export function lookOfShown({ songNo, title, genre }: ShownSong): SongLook {
  return {
    songNo,
    name: title,
    lang: HIROBA_LANG,
    artists: [],
    genres: genre === null ? [] : [genre],
    levels: null,
  };
}

/** The songs a view names, by number: what a song shows as when the catalogue lacks it. */
export function rememberedSongs(view: FavoritesView | null): ReadonlyMap<string, ShownSong> {
  const named =
    view === null ? [] : [...view.folder.songs, ...(view.song.song ? [view.song.song] : [])];
  return new Map(named.map((song) => [song.songNo, song]));
}

/** The catalogue's song, else the title Hiroba gave before, else the song's number. */
export function resolveSong(
  songNo: string,
  catalogue: ReadonlyMap<string, CatalogueSong>,
  remembered: ReadonlyMap<string, ShownSong>,
  locale: Locale,
): SongLook {
  const song = catalogue.get(songNo);
  if (song !== undefined) {
    return lookOfCatalogue(song, locale);
  }

  return lookOfShown(
    remembered.get(songNo) ?? { songNo, title: numberedSong(songNo), genre: null },
  );
}
