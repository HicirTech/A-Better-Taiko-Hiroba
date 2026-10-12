import { describe, expect, test } from "bun:test";
import type { Genre, Level, RecentPlay, ScoreRecord } from "@abth/core";

import { placePlay, playedChart } from "../src/history/placed-play";
import { songsByTitle } from "../src/history/played-song";
import type { ScoresView, ScoreView } from "../src/session-port";
import { song } from "./song-fixtures";

const NAMCO = 6;
const VARIETY = 7;
const RECORD: ScoreRecord = {
  highScore: 900000,
  good: 400,
  ok: 30,
  bad: 2,
  drumroll: 9,
  maxCombo: 120,
  stageCount: null,
  clearCount: null,
  fullComboCount: null,
  donderfulComboCount: null,
  options: { speed: 1, doron: false, abekobe: false, random: "none", supportChart: null },
};

const play = (songTitle: string, level: Level, genre: Genre | null = NAMCO): RecentPlay => ({
  songTitle,
  genre,
  level,
  crown: "gold",
  scoreRank: 5,
  record: RECORD,
});

const scored = (songNo: string, level: Level): ScoreView => ({
  ...play("", level),
  songNo,
  songTitle: `曲 ${songNo}`,
  genres: [NAMCO],
  ranking: null,
  sections: [],
  recent: null,
  fetchedAt: "2026-10-12T00:00:00.000Z",
});

// Hiroba's lists title song 450 and its cover 1257 alike; taiko.wiki tells the cover by its end.
const VIEW: ScoresView = {
  scores: [scored("450", 4)],
  unread: 0,
  songs: [
    { songNo: "450", title: "濃紅", genres: [NAMCO] },
    { songNo: "1257", title: "濃紅", genres: [VARIETY] },
    { songNo: "1", title: "てんぢく2000", genres: [NAMCO] },
  ],
};
const WIKI = songsByTitle([
  song({ songNo: "1", title: "てんぢく2000", genres: [NAMCO] }),
  song({ songNo: "450", title: "濃紅", genres: [NAMCO] }),
  song({ songNo: "1257", title: "濃紅(にじさんじ)", genres: [NAMCO] }),
  song({ songNo: "1300", title: "新しい曲", genres: [NAMCO] }),
]);

describe("placePlay", () => {
  test("opens a chart the scores hold, its song found by the lists' titles and the play's genre", () => {
    expect(placePlay(play("濃紅", 4), VIEW, WIKI)).toEqual({
      kind: "scored",
      score: scored("450", 4),
    });
  });

  test("names the song of a chart the scores hold no details of yet", () => {
    expect(placePlay(play("濃紅", 3, VARIETY), VIEW, WIKI)).toEqual({
      kind: "unread",
      songNo: "1257",
    });
    expect(placePlay(play("てんぢく2000", 5), VIEW, WIKI)).toEqual({ kind: "unread", songNo: "1" });
  });

  test("finds by taiko.wiki's titles a song no list names yet", () => {
    expect(placePlay(play("新しい曲", 4), VIEW, WIKI)).toEqual({ kind: "unread", songNo: "1300" });
  });

  test("places no song for a title two songs share, or one no list nor taiko.wiki knows", () => {
    expect(placePlay(play("濃紅", 4, null), VIEW, WIKI)).toEqual({
      kind: "unplaced",
      why: "shared",
    });
    expect(placePlay(play("まだない曲", 4), VIEW, WIKI)).toEqual({
      kind: "unplaced",
      why: "unknown",
    });
  });
});

describe("playedChart", () => {
  test("is the play's level, Hiroba's title and the title's genre", () => {
    expect(playedChart(play("新しい曲", 5, null))).toEqual({
      level: 5,
      title: "新しい曲",
      genre: null,
    });
  });
});
