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

describe("the Name & title page's name", () => {
  type NameCase = [locale: Locale, name: string];
  test.each<NameCase>([
    ["en", "Name & title"],
    ["ja", "名前と称号"],
    ["zh-Hans", "名字与称号"],
    ["zh-Hant", "名字與稱號"],
  ])("is written as the spec fixed it in %s: %p", (locale, name) => {
    expect(createTranslator(locale).t("nav.nameTitle")).toBe(name);
  });

  type TitleCase = [locale: Locale, name: string];
  test.each<TitleCase>([
    ["en", "Title"],
    ["ja", "称号"],
    ["zh-Hans", "称号"],
    ["zh-Hant", "稱號"],
  ])("calls a title what the game terms call it in %s: %p", (locale, name) => {
    expect(createTranslator(locale).t("title.heading")).toBe(name);
  });
});

/** The parameters a message names, in order of name. */
const paramsOf = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

/** A value for each language. */
type PerLanguage<T> = Readonly<Record<Locale, T>>;

/** A value that every language writes alike. */
const inEveryLanguage = <T>(value: T): PerLanguage<T> => ({
  en: value,
  ja: value,
  "zh-Hans": value,
  "zh-Hant": value,
});

/** Messages with one text in every language: the app's name, the plate's own print, a number's form. */
const SAME_EVERYWHERE: readonly MessageKey[] = [
  "app.title",
  "medal.complete",
  "costume.id",
  "costume.item.label",
  "name.counter",
  "name.siteWarning",
];

/** Messages that are one game term, as each language writes it: the text is the term and no more. */
const AS_WRITTEN: Readonly<Partial<Record<MessageKey, PerLanguage<string>>>> = {
  "scoreRank.2": { en: "White Iki", ja: "白粋", "zh-Hans": "白粹", "zh-Hant": "白粹" },
  "scoreRank.3": { en: "Bronze Iki", ja: "銅粋", "zh-Hans": "铜粹", "zh-Hant": "銅粹" },
  "scoreRank.4": { en: "Silver Iki", ja: "銀粋", "zh-Hans": "银粹", "zh-Hant": "銀粹" },
  "scoreRank.5": { en: "Gold Miyabi", ja: "金雅", "zh-Hans": "金雅", "zh-Hant": "金雅" },
  "scoreRank.6": { en: "Pink Miyabi", ja: "桃雅", "zh-Hans": "粉雅", "zh-Hant": "粉雅" },
  "scoreRank.7": { en: "Purple Miyabi", ja: "紫雅", "zh-Hans": "紫雅", "zh-Hant": "紫雅" },
  "scoreRank.8": { en: "Rainbow Kiwami", ja: "虹極", "zh-Hans": "虹极", "zh-Hant": "虹極" },
  "medal.heading": inEveryLanguage("どんメダル"),
  "costume.tab.colours": inEveryLanguage("いろ"),
  "costume.tab.items": inEveryLanguage("きせかえ"),
  "costume.part.colorFace": inEveryLanguage("かお"),
  "costume.part.colorBody": inEveryLanguage("どう"),
  "costume.part.colorLimb": inEveryLanguage("てあし"),
  "costume.part.costume1": inEveryLanguage("きぐるみ"),
  "costume.part.costume2": inEveryLanguage("あたま"),
  "costume.part.costume3": inEveryLanguage("からだ"),
  "costume.part.costume4": inEveryLanguage("メイク"),
  "costume.part.costume5": inEveryLanguage("ぷちキャラ"),
  "costume.remove": inEveryLanguage("はずす"),
};

/**
 * Words a message holds, as each language writes them: the game's terms a sentence names, and the
 * sentences of Hiroba's own that it quotes, which every language quotes as the site writes them.
 */
const QUOTED: Readonly<Partial<Record<MessageKey, PerLanguage<readonly string[]>>>> = {
  "panel.footnote": inEveryLanguage(["おに＋おに裏", "双打"]),
  "medal.none": inEveryLanguage(["どんメダル"]),
  "medal.unrecognised": inEveryLanguage(["どんメダル"]),
  "costume.preview.alt": inEveryLanguage(["マイどん"]),
  "costume.kigurumiWarning": inEveryLanguage([
    "きぐるみ",
    "あたま",
    "からだ",
    "メイク",
    "ぷちキャラ",
  ]),
  "write.needsConfirmation": inEveryLanguage([
    "これにきせかえますか？ ※組合せできない称号やきせかえが含まれています。OKするとあたらしく選んだもの以外は外れます。",
  ]),
  "write.title.needsConfirmation": inEveryLanguage([
    "この称号に設定しますカッ？ ※組合せできない称号やきせかえが含まれています。OKするとあたらしく選んだもの以外は外れます。",
  ]),
  "name.faqRule": inEveryLanguage([
    "ドンだーネームは、ひらがなと記号「ー、～、！、？」が入力可能です。５文字までです。",
  ]),
  "name.closed": inEveryLanguage(["今はドンだーネームは変更できないドン！"]),
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

  test("writes what is one text in every language alike", () => {
    for (const key of SAME_EVERYWHERE) {
      expect({ key, text: t(key) }).toEqual({ key, text: en[key] });
    }
  });

  test("writes each game term as this language writes it", () => {
    for (const [key, terms] of Object.entries(AS_WRITTEN) as [MessageKey, PerLanguage<string>][]) {
      expect({ key, text: t(key) }).toEqual({ key, text: terms[locale] });
    }
  });

  test("holds the words of the game and of Hiroba that its messages name", () => {
    for (const [key, words] of Object.entries(QUOTED) as [
      MessageKey,
      PerLanguage<readonly string[]>,
    ][]) {
      for (const word of words[locale]) {
        expect({ key, word, holds: t(key).includes(word) }).toEqual({ key, word, holds: true });
      }
    }
  });
});
