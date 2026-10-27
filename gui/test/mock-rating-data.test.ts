import { describe, expect, test } from "bun:test";

import { mockPlay } from "../scripts/mock-history";
import { ratingDataAnswer, ratingDataV2Answer } from "../scripts/mock-rating-data";
import { ratingDataOf } from "../src/shared/rating-data/read-rating-data";

describe("the stand-in's rating data", () => {
  test("measures each song's Extreme or Ura chart, at the level the stand-in plays it", () => {
    const data = ratingDataOf("ourtaikoV1", JSON.stringify(ratingDataAnswer()));
    for (const n of [3, 4, 8, 9, 398, 399]) {
      expect(data?.songs.get(String(1000 + n))?.get(mockPlay(n).level === 4 ? 4 : 5)?.notes).toBe(
        432,
      );
    }
    expect(data?.songs.has("1001")).toBe(false);
  });

  test("measures each song's Hard, Extreme or Ura chart for V2, at the level it is played", () => {
    const data = ratingDataOf("ourtaikoV2", JSON.stringify(ratingDataV2Answer()));
    for (const [n, level] of [
      [2, 3],
      [3, 4],
      [4, 5],
      [397, 3],
      [398, 4],
      [399, 5],
    ] as const) {
      expect(mockPlay(n).level).toBe(level);
      expect(data?.songs.get(String(1000 + n))?.get(level)?.notes).toBe(432);
    }
    expect(data?.songs.has("1001")).toBe(false);
  });
});
