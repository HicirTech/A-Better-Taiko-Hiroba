import { describe, expect, test } from "bun:test";

import {
  levelsOfEntry,
  lookOfCatalogue,
  lookOfShown,
  rememberedSongs,
  resolveSong,
} from "../src/favorites/song-look";
import type { FavoritesView, ShownSong } from "../src/session-port";
import { song } from "./song-fixtures";

const ALPHA = song({
  songNo: "1001",
  titleEn: "Sample Alpha",
  artists: ["アーティストA", "Artist B"],
  genres: [3, 1],
});
const SHOWN: ShownSong = { songNo: "1002", title: "サンプル曲ベータ", genre: 5 };

const WITH_INNER = { easy: 3, normal: 5, hard: 7, oni: 9, ura: 10 } as const;

describe("levelsOfEntry", () => {
  test("leaves the inner chart off a 表 row and keeps only that chart on a 裏 row", () => {
    expect(levelsOfEntry(WITH_INNER, false)).toEqual({ ...WITH_INNER, ura: null });
    expect(levelsOfEntry(WITH_INNER, true)).toEqual({
      easy: null,
      normal: null,
      hard: null,
      oni: null,
      ura: 10,
    });
  });

  test("keeps no charts for a song the catalogue lacks", () => {
    expect(levelsOfEntry(null, false)).toBeNull();
    expect(levelsOfEntry(null, true)).toBeNull();
  });
});

describe("lookOfCatalogue", () => {
  test("shows the name in the player's language, the artists, every genre and the levels", () => {
    expect(lookOfCatalogue(ALPHA, "en")).toEqual({
      songNo: "1001",
      name: "Sample Alpha",
      lang: "en",
      artists: ["アーティストA", "Artist B"],
      genres: [3, 1],
      levels: ALPHA.levels,
    });
  });

  test("has no genre for a song with none", () => {
    expect(lookOfCatalogue(song({ genres: [] }), "ja").genres).toEqual([]);
  });
});

describe("lookOfShown", () => {
  test("shows Hiroba's title and genre, with no artists and no levels", () => {
    expect(lookOfShown(SHOWN)).toEqual({
      songNo: "1002",
      name: "サンプル曲ベータ",
      lang: "ja",
      artists: [],
      genres: [5],
      levels: null,
    });
  });
});

describe("resolveSong", () => {
  const catalogue = new Map([[ALPHA.songNo, ALPHA]]);
  const remembered = new Map([
    [SHOWN.songNo, SHOWN],
    [ALPHA.songNo, { songNo: ALPHA.songNo, title: "古いタイトル", genre: 2 } as const],
  ]);

  test("takes the catalogue's song before the title read before", () => {
    expect(resolveSong("1001", catalogue, remembered, "ja").name).toBe("サンプル曲アルファ");
  });

  test("takes the title read before for a song the catalogue lacks", () => {
    expect(resolveSong("1002", catalogue, remembered, "ja")).toEqual(lookOfShown(SHOWN));
  });

  test("takes the song's number for a song neither knows", () => {
    expect(resolveSong("1003", catalogue, remembered, "ja")).toMatchObject({
      songNo: "1003",
      name: "#1003",
      genres: [],
      levels: null,
    });
  });
});

describe("rememberedSongs", () => {
  const folderSong: ShownSong = { songNo: "1002", title: "サンプル曲ベータ", genre: 5 };
  const favourite: ShownSong = { songNo: "1003", title: "サンプル曲ガンマ", genre: 2 };
  const view = (song: ShownSong | null): FavoritesView => ({
    folder: { state: { slots: ["1002"] }, songs: [folderSong] },
    song: { state: { songNo: song?.songNo ?? null, ura: false }, song },
  });

  test("names the songs of the folder and the song set, by number", () => {
    expect([...rememberedSongs(view(favourite))]).toEqual([
      ["1002", folderSong],
      ["1003", favourite],
    ]);
  });

  test("names the folder's songs alone where no song is set, and none where nothing was read", () => {
    expect([...rememberedSongs(view(null)).keys()]).toEqual(["1002"]);
    expect(rememberedSongs(null).size).toBe(0);
  });
});
