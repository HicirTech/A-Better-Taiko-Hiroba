import { describe, expect, test } from "bun:test";

import {
  type KeptCatalogue,
  keepCatalogue,
  loadCatalogue,
  mergeCatalogue,
  nextCatalogueRead,
} from "../src/favorites/catalogue-cache";
import type { CatalogueSong } from "../src/song-catalogue/types";
import { song } from "./song-fixtures";
import { memoryStorage, refusing } from "./storage-fakes";

const DAY_MS = 24 * 60 * 60 * 1000;
const kept = (songs: CatalogueSong[], sentAt = 1_000): KeptCatalogue => ({ v: 2, sentAt, songs });
const numbers = (catalogue: KeptCatalogue) => catalogue.songs.map((one) => one.songNo);

describe("mergeCatalogue", () => {
  const ALPHA = song({ songNo: "1001", title: "アルファ" });
  const BETA = song({ songNo: "1002", title: "ベータ" });

  test("is the read alone when nothing was kept", () => {
    expect(mergeCatalogue(null, { songs: [ALPHA], removed: [], sentAt: 5 })).toEqual(
      kept([ALPHA], 5),
    );
  });

  test("replaces a kept song of the same number and adds the others", () => {
    const newer = song({ songNo: "1001", title: "アルファ改" });
    const gamma = song({ songNo: "1003" });
    const merged = mergeCatalogue(kept([ALPHA, BETA]), {
      songs: [newer, gamma],
      removed: [],
      sentAt: 9,
    });
    expect(merged.songs).toEqual([newer, BETA, gamma]);
    expect(merged.sentAt).toBe(9);
  });

  test("drops the songs the read removed, and ignores a removed song that is not kept", () => {
    const merged = mergeCatalogue(kept([ALPHA, BETA]), {
      songs: [],
      removed: ["1001", "1999"],
      sentAt: 9,
    });
    expect(numbers(merged)).toEqual(["1002"]);
  });

  test("drops a song the read both sends and removes", () => {
    const merged = mergeCatalogue(kept([BETA]), { songs: [ALPHA], removed: ["1001"], sentAt: 9 });
    expect(numbers(merged)).toEqual(["1002"]);
  });
});

describe("keepCatalogue and loadCatalogue", () => {
  const FULL = song({
    songNo: "1001",
    titleEn: "Alpha",
    titleZh: "阿尔法",
    romaji: "arufa",
    artists: ["アーティスト"],
    genres: [3, 1],
    levels: { easy: 1, normal: 3, hard: 5, oni: 8, ura: 10 },
  });

  test("hand back what was kept", () => {
    const storage = memoryStorage();
    keepCatalogue(kept([FULL, song({ songNo: "1002" })], 42), storage);
    expect(loadCatalogue(storage)).toEqual(kept([FULL, song({ songNo: "1002" })], 42));
  });

  test("keep it under one key, with a version", () => {
    const storage = memoryStorage();
    keepCatalogue(kept([FULL], 42), storage);
    expect(JSON.parse(storage.getItem("abth.songCatalogue") ?? "null")).toEqual({
      v: 2,
      sentAt: 42,
      songs: [FULL],
    });
  });

  test("find nothing where nothing was kept", () => {
    expect(loadCatalogue(memoryStorage())).toBeNull();
  });

  const keptText = (songs: unknown[], v = 2) => JSON.stringify({ v, sentAt: 1, songs });
  test.each([
    ["text that is not JSON", "{"],
    ["something that is no object", "[]"],
    ["a list kept before songs had a tempo and charts", keptText([], 1)],
    ["a later version", keptText([], 3)],
    ["no read time", JSON.stringify({ v: 2, songs: [] })],
    ["a read time that is no number", JSON.stringify({ v: 2, sentAt: "1", songs: [] })],
    ["songs that are no list", JSON.stringify({ v: 2, sentAt: 1, songs: {} })],
    ["a song with no title", keptText([{ ...FULL, title: 3 }])],
    ["a song with a number that is no number", keptText([{ ...FULL, songNo: "ns2_sample" }])],
    ["a song with a genre the game does not have", keptText([{ ...FULL, genres: [9] }])],
    [
      "a song with a level that is no number",
      keptText([{ ...FULL, levels: { ...FULL.levels, oni: "8" } }]),
    ],
    ["a song with no levels", keptText([{ ...FULL, levels: undefined }])],
    ["a song with a tempo that is no tempo", keptText([{ ...FULL, bpm: "154" }])],
    ["a song with no charts", keptText([{ ...FULL, charts: undefined }])],
    [
      "a song with a chart whose pictures are no list",
      keptText([{ ...FULL, charts: { ...FULL.charts, oni: { ...FULL.charts.oni, images: "a" } } }]),
    ],
  ])("treat %s as nothing kept", (_label, text) => {
    const storage = memoryStorage();
    storage.setItem("abth.songCatalogue", text);
    expect(loadCatalogue(storage)).toBeNull();
  });

  test("work on without a store, or with one that refuses", () => {
    expect(loadCatalogue(undefined)).toBeNull();
    expect(loadCatalogue(refusing)).toBeNull();
    expect(() => keepCatalogue(kept([FULL]), refusing)).not.toThrow();
    expect(() => keepCatalogue(kept([FULL]), undefined)).not.toThrow();
  });
});

describe("nextCatalogueRead", () => {
  const NOW = 10 * DAY_MS;

  test("asks for every song when none is kept", () => {
    expect(nextCatalogueRead(null, NOW)).toEqual({ since: null });
  });

  test("asks for nothing while the kept songs are a day old at most", () => {
    expect(nextCatalogueRead(kept([], NOW), NOW)).toBeNull();
    expect(nextCatalogueRead(kept([], NOW - DAY_MS), NOW)).toBeNull();
  });

  test("asks for the changes since a day before the last read once it is over a day old", () => {
    const sentAt = NOW - DAY_MS - 1;
    expect(nextCatalogueRead(kept([], sentAt), NOW)).toEqual({ since: sentAt - DAY_MS });
  });
});
