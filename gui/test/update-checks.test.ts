import { describe, expect, test } from "bun:test";
import { err, ok } from "@abth/core";

import type { UpdateFeed, UpdateFeedFailure } from "../src/updates";
import {
  automaticUpdateOffer,
  CHECK_INTERVAL_MS,
  checkIsDue,
  isWorthShowing,
  manualUpdateCheck,
} from "../src/updates/update-checks";
import {
  keepShownVersion,
  keepUpdateCheck,
  lastShownVersion,
  lastUpdateCheck,
} from "../src/updates/update-memory";
import { memoryStorage, refusing } from "./storage-fakes";

const NOW = Date.parse("2026-10-04T10:00:00Z");
const feedOf = (version: string): UpdateFeed => ({
  version,
  notes: { en: [`Notes of ${version}`] },
});

type Answer = UpdateFeed | UpdateFeedFailure["code"];

/** A read that answers with each answer in turn, the last for good, and counts its requests. */
function reading(first: Answer, ...rest: Answer[]) {
  const answers = [first, ...rest];
  const asked = { count: 0 };
  const read = async () => {
    const answer = answers[Math.min(asked.count, answers.length - 1)] ?? first;
    asked.count += 1;
    return typeof answer === "string" ? err({ code: answer }) : ok(answer);
  };
  return { asked, read };
}

describe("checkIsDue", () => {
  test("is due when no check went out yet", () => {
    expect(checkIsDue(null, NOW)).toBe(true);
  });

  test("is due a day after the last check, and not a moment before", () => {
    expect(checkIsDue(NOW - CHECK_INTERVAL_MS, NOW)).toBe(true);
    expect(checkIsDue(NOW - CHECK_INTERVAL_MS + 1, NOW)).toBe(false);
    expect(checkIsDue(NOW, NOW)).toBe(false);
  });

  test("is due when the clock was set back since the last check", () => {
    expect(checkIsDue(NOW + 1, NOW)).toBe(true);
  });
});

describe("isWorthShowing", () => {
  type Case = [feed: string, build: string, shown: string | null, worth: boolean];
  test.each<Case>([
    ["1.1.0", "1.0.0", null, true],
    ["1.1.0", "1.0.0", "1.0.5", true],
    ["1.1.0", "1.0.0", "1.1.0", false],
    ["1.1.0", "1.0.0", "1.2.0", false],
    ["1.0.0", "1.0.0", null, false],
    ["0.9.0", "1.0.0", null, false],
    ["1.1.0", "1.1.0", null, false],
  ])("a feed of %s, to a build of %s that last told of %p, is %p", (feed, build, shown, worth) => {
    expect(isWorthShowing(feed, build, shown)).toBe(worth);
  });
});

describe("the kept memory of the checks", () => {
  test("keeps when a check went out, and the version it told of", () => {
    const storage = memoryStorage();
    expect(lastUpdateCheck(storage)).toBeNull();
    expect(lastShownVersion(storage)).toBeNull();
    keepUpdateCheck(NOW, storage);
    keepShownVersion("0.2.0", storage);
    expect(lastUpdateCheck(storage)).toBe(NOW);
    expect(lastShownVersion(storage)).toBe("0.2.0");
  });

  test("ignores a kept value that is no time and no version", () => {
    const storage = memoryStorage();
    storage.setItem("abth.update.checkedAt", "yesterday");
    storage.setItem("abth.update.shown", "latest");
    expect(lastUpdateCheck(storage)).toBeNull();
    expect(lastShownVersion(storage)).toBeNull();
  });

  test("works on without a store, or with one that refuses", () => {
    expect(lastUpdateCheck(undefined)).toBeNull();
    expect(lastShownVersion(refusing)).toBeNull();
    expect(() => keepUpdateCheck(NOW, refusing)).not.toThrow();
    expect(() => keepShownVersion("0.2.0", undefined)).not.toThrow();
  });
});

describe("automaticUpdateOffer", () => {
  test("offers a feed later than the build, and keeps that it asked and what it told of", async () => {
    const storage = memoryStorage();
    const { read } = reading(feedOf("0.2.0"));
    expect(await automaticUpdateOffer(read, "0.1.0", NOW, storage)).toEqual(feedOf("0.2.0"));
    expect(lastUpdateCheck(storage)).toBe(NOW);
    expect(lastShownVersion(storage)).toBe("0.2.0");
  });

  test("asks again a day later and not before, and tells of a version once", async () => {
    const storage = memoryStorage();
    const { asked, read } = reading(feedOf("0.2.0"), feedOf("0.2.0"), feedOf("0.3.0"));
    expect(await automaticUpdateOffer(read, "0.1.0", NOW, storage)).toEqual(feedOf("0.2.0"));

    expect(
      await automaticUpdateOffer(read, "0.1.0", NOW + CHECK_INTERVAL_MS - 1, storage),
    ).toBeNull();
    expect(asked.count).toBe(1);

    const aDayLater = NOW + CHECK_INTERVAL_MS;
    expect(await automaticUpdateOffer(read, "0.1.0", aDayLater, storage)).toBeNull();
    expect(asked.count).toBe(2);

    const twoDaysLater = aDayLater + CHECK_INTERVAL_MS;
    expect(await automaticUpdateOffer(read, "0.1.0", twoDaysLater, storage)).toEqual(
      feedOf("0.3.0"),
    );
    expect(lastShownVersion(storage)).toBe("0.3.0");
  });

  test.each(["0.2.0", "0.3.0"])(
    "offers nothing to a build of %s when the feed is 0.2.0, but notes the check",
    async (build) => {
      const storage = memoryStorage();
      const { read } = reading(feedOf("0.2.0"));
      expect(await automaticUpdateOffer(read, build, NOW, storage)).toBeNull();
      expect(lastUpdateCheck(storage)).toBe(NOW);
      expect(lastShownVersion(storage)).toBeNull();
    },
  );

  test.each<UpdateFeedFailure["code"]>(["unreachable", "timedOut", "badAnswer"])(
    "says nothing when the feed fails as %s, and notes the check",
    async (code) => {
      const storage = memoryStorage();
      const { read } = reading(code);
      expect(await automaticUpdateOffer(read, "0.1.0", NOW, storage)).toBeNull();
      expect(lastUpdateCheck(storage)).toBe(NOW);
      expect(lastShownVersion(storage)).toBeNull();
    },
  );

  test("keeps no note of a check when there is no feed to read", async () => {
    const storage = memoryStorage();
    const { read } = reading("notConfigured");
    expect(await automaticUpdateOffer(read, "0.1.0", NOW, storage)).toBeNull();
    expect(storage.length).toBe(0);
  });

  test("still offers a feed when nothing can be kept", async () => {
    const { read } = reading(feedOf("0.2.0"));
    expect(await automaticUpdateOffer(read, "0.1.0", NOW, refusing)).toEqual(feedOf("0.2.0"));
  });
});

describe("manualUpdateCheck", () => {
  test("finds a feed later than the build, as often as it is asked", async () => {
    const { read } = reading(feedOf("0.2.0"));
    expect(await manualUpdateCheck(read, "0.1.0")).toEqual({
      kind: "newer",
      feed: feedOf("0.2.0"),
    });
    expect(await manualUpdateCheck(read, "0.1.0")).toEqual({
      kind: "newer",
      feed: feedOf("0.2.0"),
    });
  });

  test.each(["0.2.0", "0.3.0"])(
    "finds a build of %s up to date with a feed of 0.2.0",
    async (build) => {
      const { read } = reading(feedOf("0.2.0"));
      expect(await manualUpdateCheck(read, build)).toEqual({ kind: "upToDate" });
    },
  );

  test.each<UpdateFeedFailure["code"]>(["notConfigured", "unreachable", "timedOut", "badAnswer"])(
    "finds the check failed when the feed fails as %s",
    async (code) => {
      const { read } = reading(code);
      expect(await manualUpdateCheck(read, "0.1.0")).toEqual({ kind: "failed" });
    },
  );
});
