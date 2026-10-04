import type { Locale } from "@abth/i18n";

import { HIROBA_LANG } from "../language/hiroba-lang";
import type { CatalogueSong } from "../song-catalogue/types";

export type NamedSong = Pick<CatalogueSong, "title" | "titleEn" | "titleZh" | "romaji">;

const HAN = /\p{Script=Han}/u;

/** The name in the player's language; Hiroba's own title where taiko.wiki has no better one. */
export function shownName(song: NamedSong, locale: Locale): string {
  switch (locale) {
    case "ja":
    case "zh-Hant":
      return song.title;
    case "en":
      return song.titleEn ?? song.title;
    case "zh-Hans":
      return song.titleZh !== null && HAN.test(song.titleZh) ? song.titleZh : song.title;
  }
}

/** The language a name of the song is written in, for the `lang` of the text that shows it. */
export function nameLanguage(song: NamedSong, name: string): string {
  if (name === song.titleEn) {
    return "en";
  }

  if (name === song.titleZh) {
    return "zh-Hans";
  }

  return name === song.romaji ? "ja-Latn" : HIROBA_LANG;
}

/** A song known by its number alone. */
export const numberedSong = (songNo: string): string => `#${songNo}`;
