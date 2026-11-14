import {
  type CatalogueSong,
  type ChineseNamesPage,
  type ChineseNamesRead,
  isObject,
} from "@abth/core";
import { keepJson, keptJson, pageStorage } from "../kept-settings";

const KEY = "abth.chineseNames";
const VERSION = 1;
/** Official names rarely change, so a month passes before they are read again. */
export const CHINESE_NAMES_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const isNamesPage = (page: unknown): page is ChineseNamesPage =>
  isObject(page) &&
  typeof page.title === "string" &&
  Array.isArray(page.names) &&
  page.names.every((name) => typeof name === "string");

function namesIn({ sentAt, pages }: Record<string, unknown>): ChineseNamesRead | null {
  return typeof sentAt === "number" && Array.isArray(pages) && pages.every(isNamesPage)
    ? { sentAt, pages }
    : null;
}

export function loadChineseNames(
  storage: Storage | undefined = pageStorage(),
): ChineseNamesRead | null {
  return keptJson(KEY, VERSION, namesIn, storage);
}

export function keepChineseNames(
  read: ChineseNamesRead,
  storage: Storage | undefined = pageStorage(),
): void {
  keepJson(KEY, VERSION, read, storage);
}

// The wikis tell songs that share a title apart with a note in brackets at the end.
const DISAMBIGUATION = /\s*[(（][^()（）]*[)）]\s*$/;

/** A title as both wikis can be matched by: compatibility forms, dashes, quotes and spaces folded. */
export function titleKey(title: string): string {
  return title
    .normalize("NFKC")
    .replace(/[‐-―−]/g, "-")
    .replace(/[‘’′`´]/g, "'")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/** The Chinese wiki's names for each song, matched by its Japanese title, then without a note. */
export function chineseNamesBySong(
  songs: readonly CatalogueSong[],
  pages: readonly ChineseNamesPage[],
): ReadonlyMap<string, readonly string[]> {
  const byTitle = new Map<string, string[]>();
  for (const page of pages) {
    for (const key of new Set([
      titleKey(page.title),
      titleKey(page.title.replace(DISAMBIGUATION, "")),
    ])) {
      byTitle.set(key, [...(byTitle.get(key) ?? []), ...page.names]);
    }
  }
  const names = new Map<string, readonly string[]>();
  for (const song of songs) {
    const found =
      byTitle.get(titleKey(song.title)) ??
      byTitle.get(titleKey(song.title.replace(DISAMBIGUATION, "")));
    if (found !== undefined) {
      names.set(song.songNo, [...new Set(found)]);
    }
  }
  return names;
}
