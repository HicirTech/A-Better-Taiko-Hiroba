import { describe, expect, test } from "bun:test";

import { newestFirst, songsByGenre } from "../src/favorites/song-order";
import { song } from "./song-fixtures";

describe("newestFirst", () => {
  test("puts the higher song number first, comparing numbers and not text", () => {
    const songs = [{ songNo: "999" }, { songNo: "1000" }, { songNo: "1001" }];
    expect(songs.sort(newestFirst).map((one) => one.songNo)).toEqual(["1001", "1000", "999"]);
  });
});

describe("songsByGenre", () => {
  const songs = [
    song({ songNo: "1001", genres: [1] }),
    song({ songNo: "1003", genres: [2, 1] }),
    song({ songNo: "1002", genres: [2] }),
    song({ songNo: "1004", genres: [] }),
  ];

  test("lists a song in each of its genres, the newest first", () => {
    const byGenre = songsByGenre(songs);
    expect(byGenre.get(1)?.map((one) => one.songNo)).toEqual(["1003", "1001"]);
    expect(byGenre.get(2)?.map((one) => one.songNo)).toEqual(["1003", "1002"]);
  });

  test("has no list for a genre without songs, and leaves the songs' own order alone", () => {
    expect(songsByGenre(songs).get(3)).toBeUndefined();
    expect(songs.map((one) => one.songNo)).toEqual(["1001", "1003", "1002", "1004"]);
  });
});
