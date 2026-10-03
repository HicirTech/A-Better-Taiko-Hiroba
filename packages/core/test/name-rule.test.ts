import { describe, expect, test } from "bun:test";

import {
  checkNameTarget,
  describeName,
  NAME_FIELDS,
  NAME_FORM_MAX_LENGTH,
  type NameState,
} from "../src/index";

const EDITOR = {
  state: { nickname: "サンプルどん" },
  maxLength: NAME_FORM_MAX_LENGTH,
  rename: "open",
} as const;

const check = (nickname: string, editor: Parameters<typeof checkNameTarget>[0] = EDITOR) =>
  checkNameTarget(editor, { nickname } satisfies NameState);
const refusal = (field: string) => ({ ok: false as const, error: { field } });

describe("checkNameTarget", () => {
  test("takes a name, with the name as it is now, as the form sends both", () => {
    expect(check("あたらしい")).toEqual({
      ok: true,
      value: { oldName: "サンプルどん", newName: "あたらしい" },
    });
  });

  test("takes a name of the form's length, in UTF-16 units, and refuses one unit more", () => {
    expect(check("a".repeat(NAME_FORM_MAX_LENGTH)).ok).toBe(true);
    expect(check("a".repeat(NAME_FORM_MAX_LENGTH + 1))).toEqual(refusal(NAME_FIELDS.tooLong));
    // Full-width characters are one unit each, as a browser counts them.
    expect(check("あ".repeat(NAME_FORM_MAX_LENGTH)).ok).toBe(true);
    expect(check("あ".repeat(NAME_FORM_MAX_LENGTH + 1))).toEqual(refusal(NAME_FIELDS.tooLong));
  });

  test("counts a character outside the BMP as the two units a browser counts it as", () => {
    expect(check("\u{20bb7}".repeat(5)).ok).toBe(true);
    expect(check("\u{20bb7}".repeat(6))).toEqual(refusal(NAME_FIELDS.tooLong));
  });

  test("goes by the length the form it read carries, not by a number of its own", () => {
    const longer = { ...EDITOR, maxLength: 12 };
    expect(check("a".repeat(12), longer).ok).toBe(true);
    expect(check("a".repeat(13), longer)).toEqual(refusal(NAME_FIELDS.tooLong));
    expect(check("a".repeat(11), { ...EDITOR, maxLength: 8 })).toEqual(
      refusal(NAME_FIELDS.tooLong),
    );
  });

  test("refuses no name", () => {
    expect(check("")).toEqual(refusal(NAME_FIELDS.empty));
  });

  type EdgeCase = [label: string, name: string];
  test.each<EdgeCase>([
    ["a leading space", " あ"],
    ["a trailing space", "あ "],
    ["a trailing non-breaking space", "あ\u{a0}"],
    ["a leading ideographic space", "\u{3000}あ"],
    ["a trailing tab", "あ\t"],
    ["only white space", "   "],
  ])("refuses %s, as the app does not trim for the player", (_label, name) => {
    expect(check(name)).toEqual(refusal(NAME_FIELDS.edge));
  });

  test("takes white space inside a name", () => {
    expect(check("あ い").ok).toBe(true);
    expect(check("あ\u{3000}い").ok).toBe(true);
  });

  type ControlCase = [label: string, name: string];
  test.each<ControlCase>([
    ["NUL", "あ\u0000い"],
    ["the last C0 control", "あ\u001fい"],
    ["DEL", "あ\u007fい"],
    ["a C1 control", "あ\u0085い"],
    ["a line separator", "あ\u{2028}い"],
    ["a paragraph separator", "あ\u{2029}い"],
    ["a lone high surrogate", "あ\ud800い"],
    ["a lone low surrogate", "あ\udc00い"],
    ["a newline inside", "あ\nい"],
  ])("refuses %s, which cannot be typed into the form", (_label, name) => {
    expect(check(name)).toEqual(refusal(NAME_FIELDS.control));
  });

  test("refuses every name while Hiroba says renames are closed, whatever the name", () => {
    const closed = { ...EDITOR, rename: "closed" } as const;
    expect(check("あたらしい", closed)).toEqual(refusal(NAME_FIELDS.closed));
    expect(check("", closed)).toEqual(refusal(NAME_FIELDS.closed));
    expect(check("a".repeat(40), closed)).toEqual(refusal(NAME_FIELDS.closed));
  });

  test("leaves a rename whose state it could not read to Hiroba", () => {
    expect(check("あたらしい", { ...EDITOR, rename: "unknown" }).ok).toBe(true);
  });

  test("reports the first of the rules, in order, when a name breaks more than one", () => {
    expect(check(" ".repeat(11))).toEqual(refusal(NAME_FIELDS.edge));
    expect(check(`${"a".repeat(11)}\u0000`)).toEqual(refusal(NAME_FIELDS.tooLong));
  });

  test("leaves the help page's rule to advice: other characters and more of them are not refused", () => {
    for (const name of [
      "Donder",
      "ドンだー",
      "太鼓の達人",
      "abc123XYZ",
      "ｱｲｳｴｵ",
      "あいうえおかきくけこ",
    ]) {
      expect(check(name).ok).toBe(true);
    }
  });
});

describe("describeName", () => {
  type AdviceCase = [label: string, name: string, expected: ReturnType<typeof describeName>];
  test.each<AdviceCase>([
    [
      "five hiragana, all the help page asks",
      "あいうえお",
      { width: 10, outsideHelpCharset: false, overFiveCharacters: false, overTenWide: false },
    ],
    [
      "hiragana with the marks the help page lists",
      "ひらー～！？",
      { width: 12, outsideHelpCharset: false, overFiveCharacters: true, overTenWide: true },
    ],
    [
      "six hiragana, one past the five",
      "あいうえおか",
      { width: 12, outsideHelpCharset: false, overFiveCharacters: true, overTenWide: true },
    ],
    [
      "Latin letters, outside the help page's set but not past its five by its own words",
      "Donder",
      { width: 6, outsideHelpCharset: true, overFiveCharacters: false, overTenWide: false },
    ],
    [
      "ten Latin letters, ten wide",
      "abcdefghij",
      { width: 10, outsideHelpCharset: true, overFiveCharacters: false, overTenWide: false },
    ],
    [
      "eleven Latin letters, wider than ten",
      "abcdefghijk",
      { width: 11, outsideHelpCharset: true, overFiveCharacters: false, overTenWide: true },
    ],
    [
      "katakana, which the help page does not name",
      "ドン",
      { width: 4, outsideHelpCharset: true, overFiveCharacters: false, overTenWide: false },
    ],
    [
      "half-width katakana, one column each",
      "ﾄﾞﾝ",
      { width: 3, outsideHelpCharset: true, overFiveCharacters: false, overTenWide: false },
    ],
    [
      "kanji",
      "太鼓",
      { width: 4, outsideHelpCharset: true, overFiveCharacters: false, overTenWide: false },
    ],
    [
      "a full-width Latin letter, two columns",
      "Ａ",
      { width: 2, outsideHelpCharset: true, overFiveCharacters: false, overTenWide: false },
    ],
    [
      "mixed Latin and kana: six characters, one not ASCII",
      "Aあいうえお",
      { width: 11, outsideHelpCharset: true, overFiveCharacters: true, overTenWide: true },
    ],
    [
      "a character outside the BMP counts once",
      "\u{20bb7}",
      { width: 2, outsideHelpCharset: true, overFiveCharacters: false, overTenWide: false },
    ],
    [
      "no name",
      "",
      { width: 0, outsideHelpCharset: false, overFiveCharacters: false, overTenWide: false },
    ],
  ])("reads %s", (_label, name, expected) => {
    expect(describeName(name)).toEqual(expected);
  });
});
