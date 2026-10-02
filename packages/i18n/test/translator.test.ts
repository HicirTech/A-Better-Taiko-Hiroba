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

/** A value for each language, in the picker's order: English, 日本語, 简体中文, 繁體中文. */
const inEach = <T>(en: T, ja: T, zhHans: T, zhHant: T): PerLanguage<T> => ({
  en,
  ja,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
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
  "panel.ranks": inEach("Score ranks", "スコアランク", "成绩排名", "成績排名"),
  "scoreRank.2": inEach("White Iki", "白粋", "白粹", "白粹"),
  "scoreRank.3": inEach("Bronze Iki", "銅粋", "铜粹", "銅粹"),
  "scoreRank.4": inEach("Silver Iki", "銀粋", "银粹", "銀粹"),
  "scoreRank.5": inEach("Gold Miyabi", "金雅", "金雅", "金雅"),
  "scoreRank.6": inEach("Pink Miyabi", "桃雅", "粉雅", "粉雅"),
  "scoreRank.7": inEach("Purple Miyabi", "紫雅", "紫雅", "紫雅"),
  "scoreRank.8": inEach("Rainbow Kiwami", "虹極", "虹极", "虹極"),
  "crowns.silver": inEach("Clear", "銀", "通关", "通過"),
  "crowns.gold": inEach("Full Combo", "金", "全连段", "全連段"),
  "crowns.donderful": inEach("Donderful Combo", "ドンダフル", "全良", "全良"),
  "medal.heading": inEach("Don Medals", "どんメダル", "咚币", "咚幣"),
  "costume.tab.colours": inEach("Colours", "いろ", "颜色", "顏色"),
  "costume.tab.items": inEach("Costume", "きせかえ", "换装", "換裝"),
  "costume.part.colorFace": inEach("Face", "かお", "脸", "臉"),
  "costume.part.colorBody": inEach("Torso", "どう", "躯体", "軀體"),
  "costume.part.colorLimb": inEach("Limbs", "てあし", "四肢", "四肢"),
  "costume.part.costume1": inEach("Mascot", "きぐるみ", "人偶装", "人偶裝"),
  "costume.part.costume2": inEach("Head", "あたま", "头", "頭"),
  "costume.part.costume3": inEach("Body", "からだ", "身体", "身體"),
  "costume.part.costume4": inEach("Makeup", "メイク", "妆容", "妝容"),
  "costume.part.costume5": inEach("Mini Character", "ぷちキャラ", "小角色", "小角色"),
  "costume.remove": inEach("Remove", "はずす", "移除", "移除"),
};

/** The costume, as each language words it in a sentence: きせかえ, 换装 and 換裝 as the site does. */
const COSTUME = inEach(["costume"], ["きせかえ"], ["换装"], ["換裝"]);

/**
 * Words a message holds, as each language writes them: the game's terms a sentence names, and the
 * sentences of Hiroba's own that it quotes, which every language quotes as the site writes them.
 */
const QUOTED: Readonly<Partial<Record<MessageKey, PerLanguage<readonly string[]>>>> = {
  "panel.footnote": inEach(
    ["Extreme and Extreme (Inner) charts", "Double Play charts"],
    ["おに＋おに裏", "双打"],
    ["魔王＋魔王(里)", "双打"],
    ["魔鬼＋魔鬼(裏)", "雙打"],
  ),
  "signIn.intro": inEach(["Donder Hiroba"], ["ドンだーひろば"], ["鼓众广场"], ["鼓眾廣場"]),
  "profile.myDonAlt": inEach(["My Don"], ["マイどん"], ["小咚"], ["小咚"]),
  "costume.openByLongPress": inEach(["My Don"], ["マイどん"], ["小咚"], ["小咚"]),
  "costume.preview.alt": inEach(
    ["My Don", "costume"],
    ["マイどん", "きせかえ"],
    ["小咚", "换装"],
    ["小咚", "換裝"],
  ),
  "costume.reading": COSTUME,
  "costume.undoLast": COSTUME,
  "write.applied": COSTUME,
  "write.undone": COSTUME,
  "write.notApplied.unchanged": COSTUME,
  "write.diverged": COSTUME,
  "write.changedSincePreview": COSTUME,
  "write.undoStale": COSTUME,
  "write.nothingToChange": COSTUME,
  "write.title.crossChanged": COSTUME,
  "write.title.crossUnknown": COSTUME,
  "medal.none": inEach(["Don Medal"], ["どんメダル"], ["咚币"], ["咚幣"]),
  "medal.unrecognised": inEach(["Don Medal"], ["どんメダル"], ["咚币"], ["咚幣"]),
  "costume.kigurumiWarning": inEach(
    ["Mascot", "Head", "Body", "Makeup", "Mini Character"],
    ["きぐるみ", "あたま", "からだ", "メイク", "ぷちキャラ"],
    ["人偶装", "头", "身体", "妆容", "小角色"],
    ["人偶裝", "頭", "身體", "妝容", "小角色"],
  ),
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
