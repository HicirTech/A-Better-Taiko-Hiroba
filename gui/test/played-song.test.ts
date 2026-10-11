import { describe, expect, test } from "bun:test";

import { playedSong, songsByTitle } from "../src/history/played-song";
import { song } from "./song-fixtures";

const NAMCO = 6;
const ANIME = 2;
const GAME = 5;

const SONGS = songsByTitle([
  song({ songNo: "1", title: "てんぢく2000", genres: [NAMCO] }),
  song({ songNo: "450", title: "濃紅", genres: [NAMCO] }),
  song({ songNo: "1257", title: "濃紅(にじさんじ)", genres: [NAMCO] }),
  song({ songNo: "153", title: "エンジェル ドリーム(デレマス)", genres: [ANIME, GAME] }),
  song({ songNo: "433", title: "エンジェル ドリーム", genres: [NAMCO] }),
  song({ songNo: "1228", title: "強風オールバック(feat.歌愛ユキ)", genres: [NAMCO] }),
]);

describe("playedSong", () => {
  test("finds the one song whose title the play names", () => {
    expect(playedSong(SONGS, { songTitle: "てんぢく2000", genre: NAMCO })).toEqual({
      outcome: "resolved",
      songNo: "1",
    });
  });

  test("keeps a title's bracketed part when the song's own title has it", () => {
    expect(
      playedSong(SONGS, { songTitle: "強風オールバック(feat.歌愛ユキ)", genre: null }),
    ).toEqual({
      outcome: "resolved",
      songNo: "1228",
    });
  });

  test("counts a cover the wiki marks with a bracketed end as sharing its original's title", () => {
    expect(playedSong(SONGS, { songTitle: "濃紅", genre: NAMCO })).toEqual({
      outcome: "ambiguous",
      candidates: ["450", "1257"],
    });
  });

  test("tells a cover from its original by the genre, when their genres differ", () => {
    expect(playedSong(SONGS, { songTitle: "エンジェル ドリーム", genre: ANIME })).toEqual({
      outcome: "resolved",
      songNo: "153",
    });
    expect(playedSong(SONGS, { songTitle: "エンジェル ドリーム", genre: NAMCO })).toEqual({
      outcome: "resolved",
      songNo: "433",
    });
  });

  test("finds nothing for a title the wiki does not list", () => {
    expect(playedSong(SONGS, { songTitle: "新しい曲", genre: NAMCO })).toEqual({
      outcome: "unknown",
    });
  });
});
