import { describe, expect, test } from "bun:test";

import {
  chineseNamesBySong,
  keepChineseNames,
  loadChineseNames,
  titleKey,
} from "../src/favorites/chinese-names";
import type { CatalogueSong } from "../src/song-catalogue";

const song = (songNo: string, title: string): CatalogueSong => ({
  songNo,
  title,
  titleEn: null,
  titleZh: null,
  romaji: null,
  artists: [],
  genres: [1],
  levels: { easy: 1, normal: 2, hard: 3, oni: 4, ura: null },
});

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  };
}

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
});
