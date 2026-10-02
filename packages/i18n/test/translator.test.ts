import { describe, expect, test } from "bun:test";

import {
  createTranslator,
  LOCALE_NAMES,
  LOCALES,
  type Locale,
  type MessageKey,
} from "../src/index";
import { en } from "../src/messages/en";

describe("createTranslator", () => {
  test("fills a parameter the message names", () => {
    const { t } = createTranslator("en");
    expect(t("profile.fetchedAt", { time: "12:00" })).toStartWith("Read at 12:00.");
  });

  test("fills a number parameter, zero included", () => {
    const { t } = createTranslator("en");
    expect(t("medal.count", { count: 0 })).toBe("Collected: 0");
  });

  test("keeps a site word it is given as written", () => {
    const { t } = createTranslator("en");
    expect(t("profile.dan", { dan: "九段" })).toBe("Dan: 九段");
  });

  test("leaves a placeholder without a parameter as written", () => {
    const { t } = createTranslator("en");
    expect(t("profile.fetchedAt")).toContain("{time}");
  });

  test("defaults to English", () => {
    expect(createTranslator().locale).toBe("en");
  });
});

describe("the translator's formats", () => {
  test("writes a count as the locale groups it", () => {
    const { number } = createTranslator("en");
    expect([0, 12, 1234].map(number)).toEqual(["0", "12", "1,234"]);
  });

  test("writes a moment as Date's own toLocaleString does", () => {
    const { dateTime } = createTranslator("en");
    const at = "2026-09-28T03:04:05Z";
    expect(dateTime(at)).toBe(new Date(at).toLocaleString("en"));
    expect(dateTime(Date.parse(at))).toBe(dateTime(new Date(at)));
  });

  test.each([...LOCALES])("writes a moment it cannot read as a dash in %s", (locale) => {
    const { dateTime } = createTranslator(locale);
    expect([dateTime("not a time"), dateTime(Number.NaN), dateTime(new Date(""))]).toEqual([
      "—",
      "—",
      "—",
    ]);
  });
});

describe("the catalog", () => {
  test("carries these locales, in the picker's order", () => {
    expect([...LOCALES]).toEqual(["en", "ja", "zh-Hans", "zh-Hant"]);
  });

  test("names each locale in its own language", () => {
    expect(LOCALES.map((locale) => LOCALE_NAMES[locale])).toEqual([
      "English",
      "日本語",
      "简体中文",
      "繁體中文",
    ]);
  });
});

describe("the Costume page's name", () => {
  type NameCase = [locale: Locale, name: string];
  test.each<NameCase>([
    ["en", "Costume"],
    ["ja", "きせかえ"],
    ["zh-Hans", "换装"],
    ["zh-Hant", "換裝"],
  ])("is written as the user fixed it in %s: %p", (locale, name) => {
    expect(createTranslator(locale).t("nav.costume")).toBe(name);
  });
});

/** The parameters a message names, in order of name. */
const paramsOf = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

/** Messages that are Hiroba's own words, or the app's name: every language shows them as written. */
const AS_WRITTEN: readonly MessageKey[] = [
  "app.title",
  "medal.heading",
  "medal.complete",
  "costume.tab.colours",
  "costume.tab.items",
  "costume.part.colorFace",
  "costume.part.colorBody",
  "costume.part.colorLimb",
  "costume.part.costume1",
  "costume.part.costume2",
  "costume.part.costume3",
  "costume.part.costume4",
  "costume.part.costume5",
  "costume.id",
  "costume.remove",
  "costume.item.label",
];

/** Site words a message quotes, which every language quotes as the site writes them. */
const QUOTED: Readonly<Partial<Record<MessageKey, readonly string[]>>> = {
  "panel.footnote": ["おに＋おに裏", "双打"],
  "medal.none": ["どんメダル"],
  "medal.unrecognised": ["どんメダル"],
  "costume.preview.alt": ["マイどん"],
  "costume.kigurumiWarning": ["きぐるみ", "あたま", "からだ", "メイク", "ぷちキャラ"],
  "write.needsConfirmation": [
    "これにきせかえますか？ ※組合せできない称号やきせかえが含まれています。OKするとあたらしく選んだもの以外は外れます。",
  ],
};

describe.each([...LOCALES])("the %s catalog", (locale) => {
  const { t } = createTranslator(locale);
  const keys = Object.keys(en) as MessageKey[];

  test("words every key with text and English's parameters", () => {
    for (const key of keys) {
      const text = t(key);
      expect({ key, empty: text.trim() === "", params: paramsOf(text) }).toEqual({
        key,
        empty: false,
        params: paramsOf(en[key]),
      });
    }
  });

  test("keeps Hiroba's own words as the site writes them", () => {
    for (const key of AS_WRITTEN) {
      expect({ key, text: t(key) }).toEqual({ key, text: en[key] });
    }
    for (const [key, words = []] of Object.entries(QUOTED) as [MessageKey, string[]][]) {
      for (const word of words) {
        expect({ key, quotes: t(key).includes(word) }).toEqual({ key, quotes: true });
      }
    }
  });
});
