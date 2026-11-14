import { describe, expect, test } from "bun:test";
import type { CatalogueSong } from "@abth/core";
import {
  chineseNamesBySong,
  keepChineseNames,
  loadChineseNames,
  titleKey,
} from "../src/shared/song-catalogue/kept-chinese-names";
import { memoryStorage } from "./storage-fakes";

const song = (songNo: string, title: string): CatalogueSong => ({
  songNo,
  title,
  titleEn: null,
  titleZh: null,
  romaji: null,
  artists: [],
  genres: [1],
  levels: { easy: 1, normal: 2, hard: 3, oni: 4, ura: null },
  bpm: null,
  charts: { easy: null, normal: null, hard: null, oni: null, ura: null },
});

describe("titleKey", () => {
  test("folds full-width forms, dashes, quotes, spaces and case", () => {
    expect(titleKey("EAT’EM UP！")).toBe(titleKey("Eat'em up!"));
    expect(titleKey("SORA‐Ⅱ グリーゼ581")).toBe(titleKey("SORA-II グリーゼ581"));
  });
});

describe("chineseNamesBySong", () => {
  test("matches by Japanese title, and without a note in brackets", () => {
    const names = chineseNamesBySong(
      [song("2", "天体観測"), song("153", "エンジェル ドリーム(デレマス)"), song("9", "其他")],
      [
        { title: "天体観測", names: ["天體觀測"] },
        { title: "エンジェル ドリーム (偶像大師)", names: ["Angel Dream"] },
      ],
    );
    expect(names).toEqual(
      new Map([
        ["2", ["天體觀測"]],
        ["153", ["Angel Dream"]],
      ]),
    );
  });
});

describe("loadChineseNames and keepChineseNames", () => {
  test("keep a read and give it back", () => {
    const storage = memoryStorage();
    const read = { sentAt: 1_700_000_000_000, pages: [{ title: "天体観測", names: ["天體觀測"] }] };
    keepChineseNames(read, storage);
    expect(loadChineseNames(storage)).toEqual(read);
  });

  test("give nothing for an empty store, another shape or broken JSON", () => {
    const storage = memoryStorage();
    expect(loadChineseNames(storage)).toBeNull();
    storage.setItem("abth.chineseNames", JSON.stringify({ v: 2, sentAt: 1, pages: [] }));
    expect(loadChineseNames(storage)).toBeNull();
    storage.setItem("abth.chineseNames", "{");
    expect(loadChineseNames(storage)).toBeNull();
  });

  test.each<[label: string, kept: object]>([
    ["no read time", { v: 1, pages: [] }],
    ["pages that are no list", { v: 1, sentAt: 1, pages: {} }],
    ["a page with no title", { v: 1, sentAt: 1, pages: [{ names: ["天體觀測"] }] }],
    [
      "a page whose names are no text",
      { v: 1, sentAt: 1, pages: [{ title: "天体観測", names: [3] }] },
    ],
  ])("give nothing for a kept read with %s", (_label, kept) => {
    const storage = memoryStorage();
    storage.setItem("abth.chineseNames", JSON.stringify(kept));
    expect(loadChineseNames(storage)).toBeNull();
  });
});
