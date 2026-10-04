import type { Locale } from "@abth/i18n";

import type { CatalogueSong } from "../song-catalogue/types";
import { foldHan } from "./han-fold";
import { type NamedSong, shownName } from "./song-names";
import { newestFirst } from "./song-order";

export const SEARCH_LIMIT = 200;

const IDEOGRAPHIC_SPACE = 0x3000;
const FULL_WIDTH_FIRST = 0xff01;
const FULL_WIDTH_LAST = 0xff5e;
const FULL_WIDTH_SHIFT = 0xfee0;
const KATAKANA_RANGES = [
  [0x30a1, 0x30f6],
  [0x30fd, 0x30fe],
] as const;
const KATAKANA_SHIFT = 0x60;

/** `[start, end)` in the text as written. */
export type BoldRange = readonly [start: number, end: number];

export interface Marked {
  readonly text: string;
  readonly bold: readonly BoldRange[];
}

export interface SearchResult {
  readonly song: CatalogueSong;
  readonly shown: Marked;
  /** The first other name that matched, when the name shown did not. */
  readonly other: Marked | null;
}

/** A piece of a marked text, bold where the search matched. */
export interface Segment {
  readonly text: string;
  readonly bold: boolean;
}

/** One character folded to the one it is searched as: lower case, half-width, hiragana, and
 * Simplified for a Traditional Chinese or Japanese kanji. */
export function foldChar(char: string): string {
  const code = char.charCodeAt(0);
  if (code === IDEOGRAPHIC_SPACE) {
    return " ";
  }

  if (code >= FULL_WIDTH_FIRST && code <= FULL_WIDTH_LAST) {
    return foldChar(String.fromCharCode(code - FULL_WIDTH_SHIFT));
  }

  if (KATAKANA_RANGES.some(([first, last]) => code >= first && code <= last)) {
    return String.fromCharCode(code - KATAKANA_SHIFT);
  }

  const lower = char.toLowerCase();
  return foldHan(lower.length === 1 ? lower : char);
}

/** One character for each one, so an index in the folded text fits the text as written. */
export const fold = (text: string): string => text.replace(/[\s\S]/g, foldChar);

/** The names a song is searched by, in the order the first other match is taken. */
export function searchedNames(song: NamedSong): readonly string[] {
  return [song.title, song.titleZh, song.titleEn, song.romaji, ...(song.chineseNames ?? [])].filter(
    (name): name is string => name !== null,
  );
}

function boldRanges(text: string, wanted: string): BoldRange[] {
  const folded = fold(text);
  const ranges: BoldRange[] = [];
  for (
    let at = folded.indexOf(wanted);
    at !== -1;
    at = folded.indexOf(wanted, at + wanted.length)
  ) {
    ranges.push([at, at + wanted.length]);
  }
  return ranges;
}

function otherMatch(song: NamedSong, shown: string, wanted: string): Marked | null {
  for (const text of searchedNames(song)) {
    if (text === shown) {
      continue;
    }

    const bold = boldRanges(text, wanted);
    if (bold.length > 0) {
      return { text, bold };
    }
  }
  return null;
}

/** The songs with the query in a name, those in the name shown first, the newest first. */
export function searchSongs(
  songs: readonly (CatalogueSong & NamedSong)[],
  query: string,
  locale: Locale,
): SearchResult[] {
  const wanted = fold(query).trim();
  if (wanted === "") {
    return [];
  }

  const inShown: SearchResult[] = [];
  const inOther: SearchResult[] = [];
  for (const song of songs) {
    const text = shownName(song, locale);
    const bold = boldRanges(text, wanted);
    if (bold.length > 0) {
      inShown.push({ song, shown: { text, bold }, other: null });
      continue;
    }

    const other = otherMatch(song, text, wanted);
    if (other !== null) {
      inOther.push({ song, shown: { text, bold: [] }, other });
    }
  }

  const byNewest = (a: SearchResult, b: SearchResult) => newestFirst(a.song, b.song);
  return [...inShown.sort(byNewest), ...inOther.sort(byNewest)].slice(0, SEARCH_LIMIT);
}

export function segmentsOf({ text, bold }: Marked): Segment[] {
  const segments: Segment[] = [];
  let at = 0;
  for (const [start, end] of bold) {
    if (start > at) {
      segments.push({ text: text.slice(at, start), bold: false });
    }
    segments.push({ text: text.slice(start, end), bold: true });
    at = end;
  }

  if (at < text.length) {
    segments.push({ text: text.slice(at), bold: false });
  }
  return segments;
}
