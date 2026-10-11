import { describe, expect, test } from "bun:test";

import { mockPlay } from "../scripts/mock-history";
import { ratingDataAnswer } from "../scripts/mock-rating-data";
import { ratingDataOf } from "../src/rating/read-rating-data";

describe("the stand-in's rating data", () => {
  test("measures each song's Extreme or Ura chart, at the level the stand-in plays it", () => {
    const data = ratingDataOf(JSON.stringify(ratingDataAnswer()));
    for (const n of [3, 4, 8, 9, 398, 399]) {
      expect(data?.get(String(1000 + n))?.get(mockPlay(n).level === 4 ? 4 : 5)?.notes).toBe(432);
    }
    expect(data?.has("1001")).toBe(false);
  });
});
