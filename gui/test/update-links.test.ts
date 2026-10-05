import { describe, expect, test } from "bun:test";

import {
  feedUrlFor,
  openableUrlOf,
  RELEASES_URL,
  REPOSITORY_URL,
  releaseUrl,
  UPDATE_FEED_URL,
} from "../src/updates";

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

describe("releaseUrl", () => {
  test("is the page of the release the tag names", () => {
    expect(releaseUrl("0.2.0")).toBe(`${RELEASES_URL}/tag/v0.2.0`);
  });
});

describe("openableUrlOf", () => {
  test.each([
    REPOSITORY_URL,
    RELEASES_URL,
    `${RELEASES_URL}/`,
    `${RELEASES_URL}/tag/v0.2.0`,
    `${RELEASES_URL}/latest/download/update.json`,
  ])("takes %s", (url) => {
    expect(openableUrlOf(url)).toBe(url);
  });

  test("gives the address as a browser spells it", () => {
    expect(openableUrlOf("https://GITHUB.com:443/HicirTech/A-Better-Taiko-Hiroba/releases")).toBe(
      RELEASES_URL,
    );
  });

  test.each([
    "",
    "not a url",
    "javascript:alert(1)",
    "file:///C:/Windows/System32/calc.exe",
    "http://github.com/HicirTech/A-Better-Taiko-Hiroba/releases",
    `${REPOSITORY_URL}/`,
    `${REPOSITORY_URL}?tab=1`,
    "https://github.com/HicirTech/A-Better-Taiko-Hiroba/issues",
    "https://github.com/HicirTech/Another-Repository/releases",
    `${RELEASES_URL}-old`,
    `${RELEASES_URL}x/tag/v1.0.0`,
    `${RELEASES_URL}?tab=1`,
    `${RELEASES_URL}/../../Another-Repository`,
    `${RELEASES_URL}/%2e%2e/%2e%2e/Another-Repository`,
    "https://github.com.example.test/HicirTech/A-Better-Taiko-Hiroba/releases",
    "https://github.com@example.test/HicirTech/A-Better-Taiko-Hiroba/releases",
    `https://example.test/${RELEASES_URL}`,
  ])("refuses %s", (url) => {
    expect(openableUrlOf(url)).toBeNull();
  });
});
