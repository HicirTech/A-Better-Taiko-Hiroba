import { describe, expect, test } from "bun:test";
import { decode } from "fast-png";

import { TITLE_PLATE, titlePlatePng } from "../scripts/mock-pictures";
import { firstDrawnRow } from "../src/pictures/first-drawn-row";

/** A 4×3 picture, transparent but for the pixels given as [column, row, alpha]. */
const pictureWith = (...drawn: readonly (readonly [number, number, number])[]) => {
  const data = new Uint8ClampedArray(4 * 3 * 4);
  for (const [column, row, alpha] of drawn) {
    data[(row * 4 + column) * 4 + 3] = alpha;
  }
  return { data, width: 4, height: 3 };
};

describe("firstDrawnRow", () => {
  test("finds the first row drawn between the columns", () => {
    expect(firstDrawnRow(pictureWith([1, 2, 255], [2, 1, 255]), 0, 1)).toBe(1);
  });

  test("passes over what is drawn outside the columns", () => {
    expect(firstDrawnRow(pictureWith([0, 0, 255], [3, 0, 255], [2, 2, 255]), 0.25, 0.75)).toBe(2);
  });

  test("passes over a faint glow", () => {
    expect(firstDrawnRow(pictureWith([1, 0, 63], [1, 1, 64]), 0, 1)).toBe(1);
  });

  test("gives the height when nothing is drawn there", () => {
    expect(firstDrawnRow(pictureWith(), 0, 1)).toBe(3);
  });

  test("finds the stand-in plate's tab under a portrait, and its crest beside it", () => {
    const plate = decode(titlePlatePng("サンプルの称号"));
    const underPortrait = { from: 77 / 290, to: 213 / 290 };
    expect(firstDrawnRow(plate, underPortrait.from, underPortrait.to)).toBe(TITLE_PLATE.tabTop);
    expect(firstDrawnRow(plate, 0, 1)).toBeLessThan(TITLE_PLATE.tabTop);
  });
});
