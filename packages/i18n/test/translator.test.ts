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
    expect(t("profile.fetchedAt", { time: "12:00" })).toBe("Last updated 12:00");
  });

  test("fills a number parameter, zero included", () => {
    const { t } = createTranslator("en");
    expect(t("medal.count", { count: 0 })).toBe("Collected: 0");
  });

  test("keeps a site word it is given as written", () => {
    const { t } = createTranslator("en");
    expect(t("profile.dan", { dan: "九段" })).toBe("Dan-i: 九段");
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

  test("writes a moment in the local zone, with the short month and the seconds", () => {
    const { dateTime } = createTranslator("en");
    const text = dateTime(new Date(2026, 9, 3, 16, 17, 54));
    expect(text).toStartWith("Oct 3, 2026, 4:17:54");
    expect(text).toEndWith("PM");
  });

  test.each([...LOCALES])("spells the month as %s writes its short name", (locale) => {
    const at = new Date(2026, 9, 3, 16, 17, 54);
    const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(at);
    expect(createTranslator(locale).dateTime(at)).toContain(month);
  });

  test("reads a Date, a number and an ISO string of one moment alike", () => {
    const { dateTime } = createTranslator("en");
    const at = "2026-09-28T03:04:05Z";
    expect(dateTime(Date.parse(at))).toBe(dateTime(at));
    expect(dateTime(new Date(at))).toBe(dateTime(at));
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

describe("the last-updated line", () => {
  type LineCase = [locale: Locale, line: string];
  test.each<LineCase>([
    ["en", "Last updated 12:00"],
    ["ja", "最終更新：12:00"],
    ["zh-Hans", "最后更新于 12:00"],
    ["zh-Hant", "最後更新於 12:00"],
  ])("is the time alone, with no note on Hiroba's own delay, in %s: %p", (locale, line) => {
    expect(createTranslator(locale).t("profile.fetchedAt", { time: "12:00" })).toBe(line);
  });
});

describe("the Costume page's name", () => {
  type NameCase = [locale: Locale, name: string];
  test.each<NameCase>([
    ["en", "Costume"],
    ["ja", "きせかえ"],
    ["zh-Hans", "换装"],
    ["zh-Hant", "換裝"],
  ])("is worded exactly so in %s: %p", (locale, name) => {
    expect(createTranslator(locale).t("nav.costume")).toBe(name);
  });
});

describe("the Nickname & title page's name", () => {
  type NameCase = [locale: Locale, name: string];
  test.each<NameCase>([
    ["en", "Nickname & title"],
    ["ja", "ドンだーネームと称号"],
    ["zh-Hans", "昵称与称号"],
    ["zh-Hant", "暱稱與稱號"],
  ])("is written as taiko.wiki words it, and as Hiroba does in ja, in %s: %p", (locale, name) => {
    expect(createTranslator(locale).t("nav.nameTitle")).toBe(name);
  });

  type NicknameCase = [locale: Locale, name: string];
  test.each<NicknameCase>([
    ["en", "Nickname"],
    ["ja", "ドンだーネーム"],
    ["zh-Hans", "昵称"],
    ["zh-Hant", "暱稱"],
  ])("calls the player's own name what taiko.wiki calls it in %s: %p", (locale, name) => {
    expect(createTranslator(locale).t("name.heading")).toBe(name);
  });

  const BANNED_NAME_WORD: Readonly<Record<Locale, RegExp>> = {
    en: /\bnames?\b/i,
    ja: /名前/,
    "zh-Hans": /名字/,
    "zh-Hant": /名字/,
  };
  const keysAboutTheNickname = (Object.keys(en) as MessageKey[]).filter(
    (key) =>
      key.startsWith("name.") ||
      key.startsWith("write.name.") ||
      key.startsWith("write.invalid.name"),
  );
  test.each([...LOCALES])(
    "words the player's name as its one term in every key about it in %s",
    (locale) => {
      const { t } = createTranslator(locale);
      const plain = keysAboutTheNickname.filter((key) =>
        BANNED_NAME_WORD[locale].test(t(key).replace(/\{\w+\}/g, "")),
      );
      expect(plain).toEqual([]);
    },
  );

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

const paramsOf = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

type PerLanguage<T> = Readonly<Record<Locale, T>>;

const inEveryLanguage = <T>(value: T): PerLanguage<T> => ({
  en: value,
  ja: value,
  "zh-Hans": value,
  "zh-Hant": value,
});

const inEach = <T>(en: T, ja: T, zhHans: T, zhHant: T): PerLanguage<T> => ({
  en,
  ja,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
});

const SAME_EVERYWHERE: readonly MessageKey[] = [
  "app.title",
  "medal.complete",
  "costume.id",
  "costume.item.label",
  "name.counter",
  "name.siteWarning",
];

/** Messages that are just one game term, as each language writes it. */
const AS_WRITTEN: Readonly<Partial<Record<MessageKey, PerLanguage<string>>>> = {
  "panel.ranks": inEach("Score ranks", "スコアランク", "成绩排名", "成績排名"),
  "scoreRank.2": inEach("White Iki", "白粋", "白粹", "白粹"),
  "scoreRank.3": inEach("Bronze Iki", "銅粋", "铜粹", "銅粹"),
  "scoreRank.4": inEach("Silver Iki", "銀粋", "银粹", "銀粹"),
  "scoreRank.5": inEach("Gold Miyabi", "金雅", "金雅", "金雅"),
  "scoreRank.6": inEach("Pink Miyabi", "桃雅", "粉雅", "粉雅"),
  "scoreRank.7": inEach("Purple Miyabi", "紫雅", "紫雅", "紫雅"),
  "scoreRank.8": inEach("Rainbow Kiwami", "虹極", "虹极", "虹極"),
  "dan.1": inEach("5th Kyu", "五級", "五级", "五級"),
  "dan.2": inEach("4th Kyu", "四級", "四级", "四級"),
  "dan.3": inEach("3rd Kyu", "三級", "三级", "三級"),
  "dan.4": inEach("2nd Kyu", "二級", "二级", "二級"),
  "dan.5": inEach("1st Kyu", "一級", "一级", "一級"),
  "dan.6": inEach("Shodan", "初段", "初段", "初段"),
  "dan.7": inEach("2nd Dan", "二段", "二段", "二段"),
  "dan.8": inEach("3rd Dan", "三段", "三段", "三段"),
  "dan.9": inEach("4th Dan", "四段", "四段", "四段"),
  "dan.10": inEach("5th Dan", "五段", "五段", "五段"),
  "dan.11": inEach("6th Dan", "六段", "六段", "六段"),
  "dan.12": inEach("7th Dan", "七段", "七段", "七段"),
  "dan.13": inEach("8th Dan", "八段", "八段", "八段"),
  "dan.14": inEach("9th Dan", "九段", "九段", "九段"),
  "dan.15": inEach("10th Dan", "十段", "十段", "十段"),
  "dan.16": inEach("Kuroto", "玄人", "玄人", "玄人"),
  "dan.17": inEach("Meijin", "名人", "名人", "名人"),
  "dan.18": inEach("Chojin", "超人", "超人", "超人"),
  "dan.19": inEach("Tatsujin", "達人", "达人", "達人"),
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

const COSTUME = inEach(["costume"], ["きせかえ"], ["换装"], ["換裝"]);

/** Words each message must hold: game terms, Hiroba's quoted sentences, where it sends the user. */
const QUOTED: Readonly<Partial<Record<MessageKey, PerLanguage<readonly string[]>>>> = {
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
  "write.applied": COSTUME,
  "write.undone": COSTUME,
  "write.notApplied.unchanged": COSTUME,
  "write.diverged": COSTUME,
  "write.changedSincePreview": COSTUME,
  "write.undoStale": COSTUME,
  "write.nothingToChange": COSTUME,
  "write.title.crossChanged": COSTUME,
  "write.title.crossUnknown": COSTUME,
  // Saved but the server was not told, and the same set cannot be sent twice ("nothing to change"):
  // the message sends the user to Hiroba's own page.
  "write.appliedNotSynced": inEach(
    ["This app cannot send it again", "on Hiroba's own page"],
    ["このアプリからは再送信できません", "ひろばのページでもう一度設定"],
    ["本应用无法重新发送", "广场自己的页面上再设置一次"],
    ["本應用程式無法重新傳送", "廣場自己的頁面上再設定一次"],
  ),
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
  "name.siteWarning": inEveryLanguage([
    "※本名などの個人情報の入力は、おやめください ※Do not enter any personal information.",
  ]),
  "name.faqRule": inEveryLanguage([
    "ドンだーネームは、ひらがなと記号「ー、～、！、？」が入力可能です。５文字までです。",
  ]),
  "name.closed": inEveryLanguage(["今はドンだーネームは変更できないドン！"]),
};

/** Messages that keep Japanese in every language: Hiroba's own warning and the sentences quoted. */
const KEEPS_JAPANESE: readonly MessageKey[] = [
  "name.siteWarning",
  "name.faqRule",
  "name.closed",
  "write.needsConfirmation",
  "write.title.needsConfirmation",
];

const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}]/u;

/** What English may not hold: a Han character or a kana. */
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

/** Global: use with `match` and `matchAll`, never `test`, whose lastIndex is stateful. */
const HAN = /\p{Script=Han}/gu;

/** Forms that are Simplified or Japanese only (zh-Hant has 雙打 and 粹, not 双打 and 粋). */
const NOT_TRADITIONAL =
  /[双粋称号换装级极达银铜连续读写显设网络应储变计页间头体妆脸颜让为这们个来时会说请编辑错误务启动关闭图帮载导览态据决备选择验证订阅广场过还进広実気読変続関対経戦楽歴圧売鉄点蔵]/u;

// Every Han character zh-Hant may use outside Hiroba's own sentences: a closed set a person has
// reviewed as Traditional. A new character fails the test below until it is reviewed and added.
const TRADITIONAL: ReadonlySet<string> = new Set(
  [
    "一七三上下不並中主之乎九也了二五交人仍他代以件任伺但位何作你使供保個做停偶傳儲允",
    "元先入內全兩八六共其再冠出分列初判別到前動包化十半南卡即卸原去又取受另只可合同名",
    "向否含和咚哪啟單嘗器四回因圍圖在執報場外多夢天夾套妝字存完官定宮容密寫寬將對小尚",
    "就尾展工己已帳幣度廣建式張形後得從復恢息情意愛態應成或戲戴把拒括持按捲排接提換",
    "援摘擇支收改效料新斷方於日明易是時暫暱曲更最會有服期未本束板枚果查核格框桌極概",
    "樣機檢次歌止正此步段每比求沒法消清為無然片版狀獲玄王現生用由留畫登白的目直相看眾",
    "知確碼示移程稱空穿窗立符算範簡粉粹系紀級紫組結絕統經維網線編縮績繪置而肢能臉自至",
    "與良色若萬著藏處號虹行表被裝製要覆見視覽角觸言計訊設許試話該詳認語誤說請證護讀",
    "變讓資超跟路身軀較載輯輸轉辨返送這通連進逾遊過達選還那部重金銀銅錄錯長閉開間關限",
    "除階隨雅面頁項預頭顏願顯馬體鼓牌",
  ].join(""),
);

const hanOf = (text: string): string[] => [...new Set(text.match(HAN) ?? [])];

const outsideTraditional = (text: string): string[] =>
  hanOf(text).filter((char) => !TRADITIONAL.has(char));

/** A message in its catalog's own language, with Hiroba's quoted Japanese sentences taken out. */
function withoutHirobasSentences(key: MessageKey, locale: Locale, text: string): string {
  return KEEPS_JAPANESE.includes(key)
    ? (QUOTED[key]?.[locale] ?? []).reduce((rest, sentence) => rest.replace(sentence, ""), text)
    : text;
}

describe.each<Locale>(["en", "zh-Hans", "zh-Hant"])("the %s catalog's language", (locale) => {
  const { t } = createTranslator(locale);
  const keys = Object.keys(en) as MessageKey[];

  test("is Japanese only where Hiroba's own words are", () => {
    const withKana = keys.filter((key) => KANA.test(t(key)));
    expect(withKana.sort()).toEqual([...KEEPS_JAPANESE].sort());
  });

  test("holds no Japanese beyond Hiroba's own sentences, and English no Chinese either", () => {
    const foreign = locale === "en" ? CJK : KANA;
    const stray = keys.filter((key) => foreign.test(withoutHirobasSentences(key, locale, t(key))));
    expect(stray).toEqual([]);
  });
});

describe("the zh-Hant catalog", () => {
  const { t } = createTranslator("zh-Hant");
  const keys = Object.keys(en) as MessageKey[];
  const ownWords = (key: MessageKey) => withoutHirobasSentences(key, "zh-Hant", t(key));

  test("uses the Han characters a person has reviewed as Traditional, all of them and no other", () => {
    const used = new Set(keys.flatMap((key) => hanOf(ownWords(key))));
    expect({
      unreviewed: keys.flatMap((key) =>
        outsideTraditional(ownWords(key)).map((char) => `${char} in ${key}`),
      ),
      unused: [...TRADITIONAL].filter((char) => !used.has(char)),
    }).toEqual({ unreviewed: [], unused: [] });
  });

  test("has reviewed Han characters only, none of them known to be Simplified or Japanese only", () => {
    expect(hanOf([...TRADITIONAL].join("")).length).toBe(TRADITIONAL.size);
    expect([...TRADITIONAL].filter((char) => NOT_TRADITIONAL.test(char))).toEqual([]);
  });
});

describe("the language guards' own checks", () => {
  test.each<[text: string, outside: string[]]>([
    ["設定", []],
    ["设定", ["设"]],
    ["门設定", ["门"]],
    ["开設定", ["开"]],
    ["帐號", ["帐"]],
    ["広場", ["広"]],
    ["Settings 設定", []],
    ["Settings 设定 and 广場", ["设", "广"]],
  ])("see in %p these Han characters no one reviewed as Traditional: %p", (text, outside) => {
    expect(outsideTraditional(text)).toEqual(outside);
  });

  test("take Hiroba's quoted sentences out of a message that quotes them, and nothing else", () => {
    const sentence = "今はドンだーネームは変更できないドン！";
    expect(withoutHirobasSentences("name.closed", "en", `Hiroba says: ${sentence}`)).toBe(
      "Hiroba says: ",
    );
    expect(withoutHirobasSentences("nav.settings", "en", sentence)).toBe(sentence);
  });

  test("still see the Chinese around a quoted sentence", () => {
    const text = "廣場說：「今はドンだーネームは変更できないドン！」，开";
    expect(outsideTraditional(withoutHirobasSentences("name.closed", "zh-Hant", text))).toEqual([
      "开",
    ]);
  });
});

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
