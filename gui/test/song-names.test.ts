import { describe, expect, test } from "bun:test";
import { LOCALES, type Locale } from "@abth/i18n";

import { nameLanguage, numberedSong, shownName } from "../src/favorites/song-names";
import { song } from "./song-fixtures";

const NAMED = song({
  title: "サンプル曲アルファ",
  titleEn: "Sample Alpha",
  titleZh: "样本曲阿尔法",
  romaji: "sanpuru kyoku arufa",
});

describe("shownName", () => {
  type NameCase = [locale: Locale, name: string];
  test.each<NameCase>([
    ["ja", "サンプル曲アルファ"],
    ["en", "Sample Alpha"],
    ["zh-Hans", "样本曲阿尔法"],
    ["zh-Hant", "サンプル曲アルファ"],
  ])("is the name written for %s: %p", (locale, name) => {
    expect(shownName(NAMED, locale)).toBe(name);
  });

  test("is Hiroba's title where taiko.wiki has no English name", () => {
    expect(shownName(song({ titleEn: null }), "en")).toBe("サンプル曲アルファ");
  });

  test("is Hiroba's title where the Chinese name holds no Han character", () => {
    expect(shownName(song({ titleZh: "Sample Alpha" }), "zh-Hans")).toBe("サンプル曲アルファ");
    expect(shownName(song({ titleZh: null }), "zh-Hans")).toBe("サンプル曲アルファ");
  });

  test.each([...LOCALES])("is the title for a song with no other name in %s", (locale) => {
    expect(shownName(song(), locale)).toBe("サンプル曲アルファ");
  });
});

describe("nameLanguage", () => {
  test.each([
    ["サンプル曲アルファ", "ja"],
    ["Sample Alpha", "en"],
    ["样本曲阿尔法", "zh-Hans"],
    ["sanpuru kyoku arufa", "ja-Latn"],
  ])("tags %p as %p", (name, language) => {
    expect(nameLanguage(NAMED, name)).toBe(language);
  });
});

describe("numberedSong", () => {
  test("writes a song by its number", () => {
    expect(numberedSong("1234")).toBe("#1234");
  });
});
