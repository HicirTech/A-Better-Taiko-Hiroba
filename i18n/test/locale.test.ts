import { describe, expect, test } from "bun:test";

import { detectLocale, isLocale, localeOfTag, matchLocale } from "../src/index";

/** The four languages the app is to carry, whatever the catalog holds so far. */
const FOUR = ["en", "ja", "zh-Hans", "zh-Hant"] as const;

describe("localeOfTag", () => {
  test("reads Hong Kong, Macao and Taiwan as Traditional Chinese", () => {
    expect(["zh-HK", "zh-MO", "zh-TW", "zh_TW"].map(localeOfTag)).toEqual([
      "zh-Hant",
      "zh-Hant",
      "zh-Hant",
      "zh-Hant",
    ]);
  });

  test("reads any other Chinese as Simplified", () => {
    expect(["zh", "zh-CN", "zh-SG", "ZH-cn"].map(localeOfTag)).toEqual([
      "zh-Hans",
      "zh-Hans",
      "zh-Hans",
      "zh-Hans",
    ]);
  });

  test("lets a written script win over the region", () => {
    expect(localeOfTag("zh-Hant-CN")).toBe("zh-Hant");
    expect(localeOfTag("zh-Hans-HK")).toBe("zh-Hans");
  });

  test("reads every other language by its language alone", () => {
    expect(["en-NZ", "ja-JP", "ko", ""].map(localeOfTag)).toEqual(["en", "ja", "ko", ""]);
  });
});

describe("matchLocale", () => {
  test("takes the first of the system's languages it carries", () => {
    expect(matchLocale(["ko-KR", "zh-TW", "ja-JP"], FOUR, "en")).toBe("zh-Hant");
  });

  test("falls back when it carries none of them", () => {
    expect(matchLocale(["ko-KR", "fr"], FOUR, "en")).toBe("en");
    expect(matchLocale([], FOUR, "en")).toBe("en");
  });

  test("gives Chinese only as the catalog spells it", () => {
    expect(matchLocale(["zh-Hans-CN"], FOUR, "en")).toBe("zh-Hans");
  });
});

describe("detectLocale", () => {
  test("picks from the catalog's own locales", () => {
    expect(detectLocale(["en-US"])).toBe("en");
    expect(detectLocale(["ja-JP"])).toBe("ja");
    expect(detectLocale(["ko-KR", "ja"])).toBe("ja");
    expect(detectLocale(["zh-CN"])).toBe("zh-Hans");
    expect(detectLocale(["zh-TW"])).toBe("zh-Hant");
    expect(detectLocale(["zh-HK", "zh-CN"])).toBe("zh-Hant");
    expect(detectLocale(["xx"])).toBe("en");
  });
});

describe("isLocale", () => {
  test("accepts a locale the catalog carries and nothing else", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("EN")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});
