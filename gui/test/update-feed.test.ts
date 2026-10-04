import { describe, expect, test } from "bun:test";

import {
  isNewer,
  isVersion,
  MAX_FEED_LENGTH,
  notesFor,
  parseUpdateFeed,
  type UpdateNotes,
} from "../src/updates";

const feedWith = (fields: Record<string, unknown>) =>
  JSON.stringify({ version: "1.2.3", notes: { en: ["Fixed a thing"] }, ...fields });

describe("isVersion", () => {
  test.each(["0.0.0", "0.1.0", "1.2.3", "10.20.30"])("takes %p", (version) => {
    expect(isVersion(version)).toBe(true);
  });

  test.each([
    "",
    "1",
    "1.2",
    "1.2.3.4",
    "v1.2.3",
    "01.2.3",
    "1.02.3",
    "1.2.3-beta",
    "1.2.3+4",
    " 1.2.3",
    "1.2.x",
  ])("refuses %p", (version) => {
    expect(isVersion(version)).toBe(false);
  });

  test("refuses what is not text", () => {
    expect([1.2, null, undefined, ["1.2.3"]].map(isVersion)).toEqual([false, false, false, false]);
  });
});

describe("parseUpdateFeed", () => {
  test("reads a version with a list of lines for each language", () => {
    const text = JSON.stringify({
      version: "0.2.0",
      notes: { en: ["First", "Second"], "zh-Hans": ["第一"], ja: ["最初"], "zh-Hant": ["第一"] },
    });
    expect(parseUpdateFeed(text)).toEqual({
      ok: true,
      value: {
        version: "0.2.0",
        notes: { en: ["First", "Second"], ja: ["最初"], "zh-Hans": ["第一"], "zh-Hant": ["第一"] },
      },
    });
  });

  test("ignores a field and a language it does not know, so a newer feed still reads", () => {
    const text = feedWith({ title: "News", notes: { en: ["One"], ko: ["하나"] } });
    expect(parseUpdateFeed(text)).toEqual({
      ok: true,
      value: { version: "1.2.3", notes: { en: ["One"] } },
    });
  });

  type RefusedCase = [why: string, text: string, mentions: string];
  test.each<RefusedCase>([
    ["text that is not JSON", "{", "JSON"],
    ["a list", "[]", "object"],
    ["null", "null", "object"],
    ["no version", JSON.stringify({ notes: { en: ["One"] } }), "version"],
    ["a version with a v", feedWith({ version: "v1.2.3" }), "version"],
    ["a version of two parts", feedWith({ version: "1.2" }), "version"],
    ["a version that is a number", feedWith({ version: 1.2 }), "version"],
    ["no notes", JSON.stringify({ version: "1.2.3" }), "notes"],
    ["notes that are a list", feedWith({ notes: ["One"] }), "notes"],
    ["notes that are text", feedWith({ notes: "One" }), "notes"],
    ["notes with no language the app has", feedWith({ notes: { ko: ["하나"] } }), "notes"],
    ["notes with no language at all", feedWith({ notes: {} }), "notes"],
    ["a language whose lines are text", feedWith({ notes: { en: "One" } }), "notes.en"],
    ["a language with no lines", feedWith({ notes: { ja: [] } }), "notes.ja"],
    ["a line that is a number", feedWith({ notes: { en: ["One", 2] } }), "notes.en"],
    ["a line of spaces", feedWith({ notes: { "zh-Hans": ["  "] } }), "notes.zh-Hans"],
  ])("refuses %s", (_why, text, mentions) => {
    const parsed = parseUpdateFeed(text);
    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && parsed.error).toContain(mentions);
  });

  test("refuses a feed longer than the cap, and takes one of exactly the cap", () => {
    const padded = (length: number) => {
      const text = feedWith({});
      return `${text}${" ".repeat(length - text.length)}`;
    };
    expect(parseUpdateFeed(padded(MAX_FEED_LENGTH)).ok).toBe(true);
    expect(parseUpdateFeed(padded(MAX_FEED_LENGTH + 1)).ok).toBe(false);
  });
});

describe("isNewer", () => {
  test.each([
    ["1.0.1", "1.0.0"],
    ["1.1.0", "1.0.9"],
    ["2.0.0", "1.9.9"],
    ["0.10.0", "0.9.0"],
    ["1.0.10", "1.0.9"],
  ])("%s is later than %s", (version, than) => {
    expect(isNewer(version, than)).toBe(true);
  });

  test.each([
    ["1.0.0", "1.0.0"],
    ["1.0.0", "1.0.1"],
    ["0.9.0", "0.10.0"],
    ["1.9.9", "2.0.0"],
  ])("%s is not later than %s", (version, than) => {
    expect(isNewer(version, than)).toBe(false);
  });

  test("is false when either is not a version", () => {
    expect(isNewer("2.0.0", "latest")).toBe(false);
    expect(isNewer("v2.0.0", "1.0.0")).toBe(false);
    expect(isNewer("2.0", "1.0.0")).toBe(false);
  });
});

describe("notesFor", () => {
  const feed = (notes: UpdateNotes) => ({ version: "1.0.0", notes });
  const ALL = { en: ["en"], ja: ["ja"], "zh-Hans": ["hans"], "zh-Hant": ["hant"] };

  test.each([
    ["en", "en"],
    ["ja", "ja"],
    ["zh-Hans", "hans"],
    ["zh-Hant", "hant"],
  ] as const)("gives %s its own list", (locale, line) => {
    expect(notesFor(feed(ALL), locale)).toEqual([line]);
  });

  test("gives a Chinese language the other Chinese's list before English's", () => {
    const notes = { en: ["en"], "zh-Hant": ["hant"] };
    expect(notesFor(feed(notes), "zh-Hans")).toEqual(["hant"]);
    expect(notesFor(feed({ en: ["en"], "zh-Hans": ["hans"] }), "zh-Hant")).toEqual(["hans"]);
  });

  test("gives English's list to a language with none of its own, Chinese notes aside", () => {
    expect(notesFor(feed({ en: ["en"], "zh-Hans": ["hans"] }), "ja")).toEqual(["en"]);
  });

  test("gives the first list there is when English has none", () => {
    expect(notesFor(feed({ ja: ["ja"], "zh-Hant": ["hant"] }), "en")).toEqual(["ja"]);
  });

  test("gives nothing for a feed with no list", () => {
    expect(notesFor(feed({}), "en")).toEqual([]);
  });
});
