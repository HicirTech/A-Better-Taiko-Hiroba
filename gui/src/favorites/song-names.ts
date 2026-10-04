import type { Locale } from "@abth/i18n";

import { HIROBA_LANG } from "../language/hiroba-lang";
import type { CatalogueSong } from "../song-catalogue/types";
import { foldHan } from "./han-fold";

export type NamedSong = Pick<CatalogueSong, "title" | "titleEn" | "titleZh" | "romaji"> & {
  /** The Chinese wiki's official names, once the window has matched them to the song. */
  readonly chineseNames?: readonly string[];
};

const HAN = /\p{Script=Han}/u;

const chineseName = (name: string | null | undefined): name is string =>
  name !== null && name !== undefined && HAN.test(name);

const simplified = (name: string): string => name.replace(/[\s\S]/g, foldHan);

/** The name in the player's language; Hiroba's own title where neither wiki has one. */
export function shownName(song: NamedSong, locale: Locale): string {
  const official = song.chineseNames?.find(chineseName);
  switch (locale) {
    case "ja":
      return song.title;
    case "en":
      return song.titleEn ?? song.title;
    case "zh-Hans":
      if (chineseName(song.titleZh)) {
        return song.titleZh;
      }
      return official === undefined ? song.title : simplified(official);
    case "zh-Hant":
      return official ?? song.title;
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

  if (song.chineseNames?.includes(name)) {
    return "zh-Hant";
  }

  if (name === song.romaji) {
    return "ja-Latn";
  }

  // A Chinese wiki's name shown in Simplified characters.
  return name !== song.title && chineseName(name) ? "zh-Hans" : HIROBA_LANG;
}

/** A song known by its number alone. */
export const numberedSong = (songNo: string): string => `#${songNo}`;
