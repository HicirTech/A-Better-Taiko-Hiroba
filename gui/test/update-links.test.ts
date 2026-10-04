import { describe, expect, test } from "bun:test";

import { feedUrlFor, RELEASES_URL, UPDATE_FEED_URL } from "../src/updates";

describe("the feed's address", () => {
  test("is the latest release's update.json", () => {
    expect(RELEASES_URL).toBe("https://github.com/HicirTech/A-Better-Taiko-Hiroba/releases");
    expect(UPDATE_FEED_URL).toBe(
      "https://github.com/HicirTech/A-Better-Taiko-Hiroba/releases/latest/download/update.json",
    );
  });
});

describe("feedUrlFor", () => {
  test("is the real feed in a build, whatever a development override says", () => {
    expect(feedUrlFor(false, undefined)).toBe(UPDATE_FEED_URL);
    expect(feedUrlFor(false, "http://feed.test/update.json")).toBe(UPDATE_FEED_URL);
  });

  test("is only the override in a development run", () => {
    expect(feedUrlFor(true, "http://feed.test/update.json")).toBe("http://feed.test/update.json");
  });

  test("is nothing in a development run with no override, or an empty one", () => {
    expect(feedUrlFor(true, undefined)).toBeUndefined();
    expect(feedUrlFor(true, "")).toBeUndefined();
  });
});
