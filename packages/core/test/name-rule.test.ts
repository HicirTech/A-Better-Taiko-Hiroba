import { describe, expect, test } from "bun:test";

import { checkNameTarget, NAME_FIELDS, NAME_FORM_MAX_LENGTH, type NameState } from "../src/index";

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
