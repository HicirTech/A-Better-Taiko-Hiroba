import { describe, expect, test } from "bun:test";
import type { Locale } from "@abth/i18n";

import {
  fold,
  foldChar,
  SEARCH_LIMIT,
  searchedNames,
  searchSongs,
  segmentsOf,
} from "../src/favorites/song-search";
import type { CatalogueSong } from "../src/song-catalogue/types";
import { song } from "./song-fixtures";

describe("fold", () => {
  test.each([
    ["ABC xyz", "abc xyz"],
    ["ＡＢＣ１２３～", "abc123~"],
    ["アルファ・ベータ", "あるふぁ・べーた"],
    ["ヽヾヶ", "ゝゞゖ"],
    ["a\u{3000}b", "a b"],
    ["漢字とｱ", "汉字とｱ"],
    ["時空庁 天體觀測", "时空厅 天体观测"],
  ])("folds %p to %p", (text, folded) => {
    expect(fold(text)).toBe(folded);
  });

  test("gives back one character for each, so an index fits the text as written", () => {
    for (const text of ["İstanbul ＡＢＣ アルファ", "\u{20bb7}野家 Σ", "ǅ ẞ"]) {
      expect(fold(text).length).toBe(text.length);
    }
  });
});

describe("foldChar", () => {
  test.each([
    ["A", "a"],
    ["Ａ", "a"],
    ["ア", "あ"],
    ["\u{3000}", " "],
    ["漢", "汉"],
    ["観", "观"],
    ["观", "观"],
    ["İ", "İ"],
  ])("folds %p to %p", (char, folded) => {
    expect(foldChar(char)).toBe(folded);
  });
});

describe("searchedNames", () => {
  test("lists the title, the Chinese, the English and the romaji names a song has, in that order", () => {
    expect(searchedNames(song({ title: "t", titleZh: "z", titleEn: "e", romaji: "r" }))).toEqual([
      "t",
      "z",
      "e",
      "r",
    ]);
    expect(searchedNames(song({ title: "t", titleEn: "e" }))).toEqual(["t", "e"]);
  });

  test("ends with the Chinese wiki's names", () => {
    expect(
      searchedNames({ ...song({ title: "t", titleEn: "e" }), chineseNames: ["c1", "c2"] }),
    ).toEqual(["t", "e", "c1", "c2"]);
  });
});

describe("searchSongs", () => {
  const ALPHA = song({
    songNo: "1001",
    title: "アルファの冒険",
    titleEn: "Alpha Adventure",
    titleZh: "阿尔法的冒险",
    romaji: "arufa no bouken",
  });
  const BETA = song({ songNo: "1002", title: "Beta Beat", titleEn: "Beta Beat EN" });
  const SONGS = [ALPHA, BETA];

  test("finds nothing for a query that is empty once trimmed", () => {
    expect(searchSongs(SONGS, "", "ja")).toEqual([]);
    expect(searchSongs(SONGS, "  \u{3000} ", "ja")).toEqual([]);
  });

  test.each([
    ["the title", "冒険"],
    ["the title, as hiragana for its katakana", "あるふぁ"],
    ["the English name, in any case", "ALPHA adv"],
    ["the English name, in full-width letters", "ＡＬＰＨＡ"],
    ["the Chinese name", "阿尔法"],
    ["the romaji", "no bou"],
  ])("finds a song by part of %s", (_label, query) => {
    expect(searchSongs(SONGS, query, "ja").map((found) => found.song.songNo)).toEqual(["1001"]);
  });

  test("matches Traditional, Simplified and Japanese forms alike, marked on the name as written", () => {
    const office = song({ songNo: "1003", title: "時空庁時空1課" });
    for (const query of ["時空庁", "時空廳", "时空厅"]) {
      const [found] = searchSongs([office], query, "ja");
      expect(found?.shown).toEqual({ text: "時空庁時空1課", bold: [[0, 3]] });
    }
  });

  test("finds a song by the Chinese wiki's name, which then follows in brackets", () => {
    const named = {
      ...song({ songNo: "1004", title: "ゲラゲラポーのうた" }),
      chineseNames: ["喀啦喀啦碰之歌"],
    };
    const [found] = searchSongs([named], "碰之歌", "en");
    expect(found?.shown).toEqual({ text: "ゲラゲラポーのうた", bold: [] });
    expect(found?.other).toEqual({ text: "喀啦喀啦碰之歌", bold: [[4, 7]] });
  });

  test("trims the query before it looks", () => {
    expect(searchSongs(SONGS, "  冒険\u{3000}", "ja")).toHaveLength(1);
  });

  test("marks every place the shown name matches, by index into the name as written", () => {
    const [found] = searchSongs([song({ title: "ＡＢＣ\u{3000}アルファabc" })], "ABC", "ja");
    expect(found?.shown).toEqual({
      text: "ＡＢＣ\u{3000}アルファabc",
      bold: [
        [0, 3],
        [8, 11],
      ],
    });
    expect(found?.other).toBeNull();
  });

  test("shows the name for the player's language, and marks it there", () => {
    const [found] = searchSongs(SONGS, "adv", "en");
    expect(found?.shown).toEqual({ text: "Alpha Adventure", bold: [[6, 9]] });
    expect(found?.other).toBeNull();
  });

  test("names no other when the shown name matches, though another name matches too", () => {
    const [found] = searchSongs(SONGS, "alpha", "en");
    expect(found?.shown.bold).toEqual([[0, 5]]);
    expect(found?.other).toBeNull();
  });

  test("names the first other name that matches when the shown one does not", () => {
    const [found] = searchSongs(SONGS, "bouken", "en");
    expect(found?.shown).toEqual({ text: "Alpha Adventure", bold: [] });
    expect(found?.other).toEqual({ text: "arufa no bouken", bold: [[9, 15]] });
  });

  test("takes the other names in the order title, Chinese, English, romaji", () => {
    const names = { title: "yy", titleZh: "xx zh", titleEn: "xx en", romaji: "xx romaji" };
    const otherOf = (overrides: Partial<CatalogueSong>, locale: Locale) =>
      searchSongs([song({ ...names, ...overrides })], "xx", locale)[0]?.other?.text;
    expect(otherOf({}, "ja")).toBe("xx zh");
    expect(otherOf({ titleZh: null }, "ja")).toBe("xx en");
    expect(otherOf({ titleZh: null, titleEn: null }, "ja")).toBe("xx romaji");
    expect(otherOf({ title: "xx title", titleEn: "yy" }, "en")).toBe("xx title");
  });

  test("lists the songs matched in the shown name first, then the newest song first", () => {
    const songs = [
      song({ songNo: "1100", title: "zzz", romaji: "key" }),
      song({ songNo: "1001", title: "key one" }),
      song({ songNo: "1050", title: "other", titleEn: "key two" }),
      song({ songNo: "1200", title: "key three" }),
      song({ songNo: "1010", title: "unrelated" }),
    ];
    expect(searchSongs(songs, "key", "ja").map((found) => found.song.songNo)).toEqual([
      "1200",
      "1001",
      "1100",
      "1050",
    ]);
  });

  test("compares song numbers as numbers", () => {
    const songs = [song({ songNo: "999", title: "key" }), song({ songNo: "1000", title: "key" })];
    expect(searchSongs(songs, "key", "ja").map((found) => found.song.songNo)).toEqual([
      "1000",
      "999",
    ]);
  });

  test("returns at most 200 songs", () => {
    const songs = Array.from({ length: SEARCH_LIMIT + 50 }, (_, index) =>
      song({ songNo: String(1000 + index), title: `key ${index}` }),
    );
    const found = searchSongs(songs, "key", "ja");
    expect(found).toHaveLength(SEARCH_LIMIT);
    expect(found[0]?.song.songNo).toBe(String(1000 + SEARCH_LIMIT + 49));
  });
});

describe("segmentsOf", () => {
  test("cuts a text into plain and bold pieces", () => {
    expect(
      segmentsOf({
        text: "abcdefg",
        bold: [
          [1, 3],
          [4, 7],
        ],
      }),
    ).toEqual([
      { text: "a", bold: false },
      { text: "bc", bold: true },
      { text: "d", bold: false },
      { text: "efg", bold: true },
    ]);
  });

  test("keeps a text with nothing marked whole, and bolds one marked from end to end", () => {
    expect(segmentsOf({ text: "abc", bold: [] })).toEqual([{ text: "abc", bold: false }]);
    expect(segmentsOf({ text: "abc", bold: [[0, 3]] })).toEqual([{ text: "abc", bold: true }]);
  });
});
