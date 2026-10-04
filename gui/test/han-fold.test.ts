import { describe, expect, test } from "bun:test";

import { foldHan } from "../src/favorites/han-fold";
import { HAN_FOLDED_FROM, HAN_FOLDED_TO } from "../src/favorites/han-fold-table";

describe("foldHan", () => {
  test.each([
    ["觀", "观"],
    ["體", "体"],
    ["廳", "厅"],
    ["裡", "里"],
    ["裏", "里"],
  ])("folds the Traditional %s to %s", (traditional, simplified) => {
    expect(foldHan(traditional)).toBe(simplified);
  });

  test.each([
    ["観", "观"],
    ["庁", "厅"],
    ["黒", "黑"],
    ["両", "两"],
  ])("folds the Japanese %s to %s", (japanese, simplified) => {
    expect(foldHan(japanese)).toBe(simplified);
  });

  test("leaves Simplified characters, kana and Latin letters as they are", () => {
    for (const char of ["观", "体", "学", "あ", "ア", "a", "1", " "]) {
      expect(foldHan(char)).toBe(char);
    }
  });

  test("pairs every character with exactly one", () => {
    expect(Array.from(HAN_FOLDED_FROM)).toHaveLength(Array.from(HAN_FOLDED_TO).length);
    expect(new Set(Array.from(HAN_FOLDED_FROM)).size).toBe(Array.from(HAN_FOLDED_FROM).length);
  });
});
