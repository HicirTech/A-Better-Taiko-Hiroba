import { describe, expect, test } from "bun:test";

import { COVER_LEAST_MS, COVER_MOST_MS, coverGoesAt } from "../src/app/launch-cover-times";

const SHOWN_AT = 1_000;

describe("coverGoesAt", () => {
  test("keeps the cover its least time when the first screen is drawn sooner", () => {
    expect(coverGoesAt(SHOWN_AT, SHOWN_AT + 100)).toBe(SHOWN_AT + COVER_LEAST_MS);
  });

  test("takes the cover away as the first screen is drawn between its least and most times", () => {
    const drawnAt = SHOWN_AT + COVER_LEAST_MS + 500;

    expect(coverGoesAt(SHOWN_AT, drawnAt)).toBe(drawnAt);
  });

  test("takes the cover away at its most time when the first screen comes later or not at all", () => {
    expect(coverGoesAt(SHOWN_AT, SHOWN_AT + COVER_MOST_MS + 1)).toBe(SHOWN_AT + COVER_MOST_MS);
    expect(coverGoesAt(SHOWN_AT, null)).toBe(SHOWN_AT + COVER_MOST_MS);
  });
});
