import { keepSetting, pageStorage } from "../kept-settings";
import type { CatalogueSong, ChineseNamesPage, ChineseNamesRead } from "../song-catalogue";

const KEY = "abth.chineseNames";
const VERSION = 1;
/** Official names rarely change, so a month passes before they are read again. */
export const CHINESE_NAMES_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function loadChineseNames(
  storage: Storage | undefined = pageStorage(),
): ChineseNamesRead | null {
  try {
    const kept: unknown = JSON.parse(storage?.getItem(KEY) ?? "null");
    return isKept(kept) ? { sentAt: kept.sentAt, pages: kept.pages } : null;
  } catch {
    return null;
  }
}

export function keepChineseNames(
  read: ChineseNamesRead,
  storage: Storage | undefined = pageStorage(),
): void {
  keepSetting(KEY, JSON.stringify({ v: VERSION, ...read }), storage);
}

function isKept(
  value: unknown,
): value is { readonly sentAt: number; readonly pages: ChineseNamesPage[] } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { v, sentAt, pages } = value as Record<string, unknown>;
  return (
    v === VERSION &&
    typeof sentAt === "number" &&
    Array.isArray(pages) &&
    pages.every(
      (page) =>
        typeof page?.title === "string" &&
        Array.isArray(page.names) &&
        page.names.every((name: unknown) => typeof name === "string"),
    )
  );
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
