import { describe, expect, test } from "bun:test";

import {
  GIFT_SONG_LIMIT,
  GIFT_TITLE_MAX_LENGTH,
  type Gift,
  giftCode,
  scannedCodeOf,
} from "../src/shared/gifts/gift-code";

const GIFT: Gift = {
  songs: ["1178", "1001", "365", "1203"],
  giver: "ドン子ちゃん",
  title: "お誕生日おめでとう！",
  madeAt: Date.UTC(2026, 9, 29, 3, 15, 30),
  shown: true,
};
const codeOf = (changes: Record<string, unknown>) =>
  JSON.stringify({ ...JSON.parse(giftCode(GIFT)), ...changes });

describe("giftCode", () => {
  test("reads back as the gift it was made from", () => {
    expect(scannedCodeOf(giftCode(GIFT))).toEqual({ kind: "gift", gift: GIFT });
    const mystery = { ...GIFT, songs: ["1001"], title: "", shown: false };
    expect(scannedCodeOf(giftCode(mystery))).toEqual({ kind: "gift", gift: mystery });
  });

  test("keeps the time to the second, and carries no taiko number", () => {
    const code = giftCode({ ...GIFT, madeAt: GIFT.madeAt + 999 });
    expect(scannedCodeOf(code)).toEqual({ kind: "gift", gift: GIFT });
    expect(Object.keys(JSON.parse(code)).sort()).toEqual(["abth", "g", "h", "n", "s", "t", "v"]);
  });
});

describe("scannedCodeOf", () => {
  test("knows nothing of a code that is no gift of this app", () => {
    for (const text of ["https://example.test/", "{", "[1178]", "null", codeOf({ abth: "set" })]) {
      expect(scannedCodeOf(text)).toEqual({ kind: "unknown" });
    }
    expect(scannedCodeOf(codeOf({ v: 2 }))).toEqual({ kind: "unknown" });
  });

  test("refuses a gift outside its limits", () => {
    const tooMany = Array.from({ length: GIFT_SONG_LIMIT + 1 }, (_, index) => 1001 + index);
    for (const changes of [
      { s: [] },
      { s: tooMany },
      { s: [1001, 1001] },
      { s: ["1001"] },
      { s: [1.5] },
      { g: " " },
      { g: "とても長い名前のプレイヤー" },
      { n: "あ".repeat(GIFT_TITLE_MAX_LENGTH + 1) },
      { t: 0 },
      { t: "1793180100" },
      { h: 1 },
    ]) {
      expect(scannedCodeOf(codeOf(changes))).toEqual({ kind: "unknown" });
    }
  });
});
