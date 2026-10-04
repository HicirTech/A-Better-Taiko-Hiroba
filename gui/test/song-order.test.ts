import { describe, expect, test } from "bun:test";

import { newestFirst } from "../src/favorites/song-order";

describe("newestFirst", () => {
  test("puts the higher song number first, comparing numbers and not text", () => {
    const songs = [{ songNo: "999" }, { songNo: "1000" }, { songNo: "1001" }];
    expect(songs.sort(newestFirst).map((one) => one.songNo)).toEqual(["1001", "1000", "999"]);
  });
});
