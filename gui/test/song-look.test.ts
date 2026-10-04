import { describe, expect, test } from "bun:test";

import { lookOfCatalogue, lookOfShown, resolveSong } from "../src/favorites/song-look";
import type { ShownSong } from "../src/session-port";
import { song } from "./song-fixtures";

const ALPHA = song({
  songNo: "1001",
  titleEn: "Sample Alpha",
  artists: ["アーティストA", "Artist B"],
  genres: [3, 1],
});
const SHOWN: ShownSong = { songNo: "1002", title: "サンプル曲ベータ", genre: 5 };

describe("lookOfCatalogue", () => {
  test("shows the name in the player's language, the artists, the first genre and the levels", () => {
    expect(lookOfCatalogue(ALPHA, "en")).toEqual({
      songNo: "1001",
      name: "Sample Alpha",
      lang: "en",
      artists: ["アーティストA", "Artist B"],
      genre: 3,
      levels: ALPHA.levels,
    });
  });

  test("has no genre for a song with none", () => {
    expect(lookOfCatalogue(song({ genres: [] }), "ja").genre).toBeNull();
  });
});

describe("lookOfShown", () => {
  test("shows Hiroba's title and genre, with no artists and no levels", () => {
    expect(lookOfShown(SHOWN)).toEqual({
      songNo: "1002",
      name: "サンプル曲ベータ",
      lang: "ja",
      artists: [],
      genre: 5,
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
      genre: null,
      levels: null,
    });
  });
});
