import { describe, expect, test } from "bun:test";

import {
  type CrownState,
  chartKey,
  chartsToRead,
  EMPTY_SCORE_BOOK,
  foldDetail,
  foldLists,
  GENRES,
  type Genre,
  type GenreList,
  genresToRead,
  type Level,
  noteWalk,
  type RecentPlay,
  recentOrder,
  type Score,
  type ScoreBook,
  type ScoreRecord,
  songCharts,
} from "../src/index";

const READ_AT = "2026-10-10T12:00:00.000Z";
const LATER = "2026-10-11T12:00:00.000Z";

const RECORD: ScoreRecord = {
  highScore: 900000,
  good: 400,
  ok: 20,
  bad: 1,
  drumroll: 9,
  maxCombo: 300,
  stageCount: 2,
  clearCount: 2,
  fullComboCount: 0,
  donderfulComboCount: 0,
  options: { speed: 1, doron: false, abekobe: false, random: "none", supportChart: null },
};

const listed = (songNo: string, level: Level, crown: CrownState = "silver"): Score => ({
  taikoNo: "000000000000",
  songNo,
  level,
  crown,
  scoreRank: crown === "none" ? null : 5,
  fidelity: "list",
  record: null,
  fetchedAt: READ_AT,
});

/** The details of a chart as its list showed it. */
const detailOf = (score: Score, fetchedAt = READ_AT): Score => ({
  ...score,
  fidelity: "detail",
  record: RECORD,
  fetchedAt,
});

const play = (songTitle: string, genre: Genre | null, level: Level): RecentPlay => ({
  songTitle,
  genre,
  level,
  crown: "gold",
  scoreRank: 6,
  record: RECORD,
});

/** Genre 1 holds 100 (four charts, two played) and 101, which shares 102's title in genre 5. */
const LISTS: readonly GenreList[] = GENRES.map((genre) => {
  const songs =
    genre === 1
      ? [
          { songNo: "100", title: "一番目", genres: [1 as const] },
          { songNo: "101", title: "同じ名前", genres: [1 as const] },
        ]
      : genre === 5
        ? [{ songNo: "102", title: "同じ名前", genres: [5 as const] }]
        : [];
  const scores =
    genre === 1
      ? [
          listed("100", 1, "none"),
          listed("100", 2),
          listed("100", 3, "none"),
          listed("100", 4, "played"),
          listed("101", 4),
        ]
      : genre === 5
        ? [listed("102", 4)]
        : [];
  return { genre, reading: { songs, scores } };
});

const keys = (book: ScoreBook) =>
  chartsToRead(book).map(({ songNo, level }) => `${songNo}/${level}`);

/** A full read done: every list, then every played chart's details. */
function readInFull(): ScoreBook {
  const listedBook = foldLists(EMPTY_SCORE_BOOK, LISTS);
  return chartsToRead(listedBook).reduce((book, chart) => {
    const score = listedBook.scores[chartKey(chart)];
    if (score === undefined) {
      throw new Error(`no list names ${chartKey(chart)}`);
    }
    return foldDetail(book, detailOf(score));
  }, listedBook);
}

describe("the score book", () => {
  test("a book never read takes every list, and a walk notes nothing in it", () => {
    expect(genresToRead(EMPTY_SCORE_BOOK)).toEqual(GENRES);
    const walked = noteWalk(EMPTY_SCORE_BOOK, { fresh: [play("一番目", 1, 2)], stop: "known" });
    expect(walked).toBe(EMPTY_SCORE_BOOK);
  });

  test("a full read's lists leave every played chart to detail, and no unplayed one", () => {
    const book = foldLists(EMPTY_SCORE_BOOK, LISTS);
    expect(book.full).toBe(false);
    expect(genresToRead(book)).toEqual([]);
    expect(keys(book)).toEqual(["100/2", "100/4", "101/4", "102/4"]);
  });

  test("a full read that took only some lists is still due in full", () => {
    const book = foldLists(EMPTY_SCORE_BOOK, LISTS.slice(0, 3));
    expect(book.full).toBe(true);
    expect(genresToRead(book)).toEqual(GENRES);
  });

  test("a chart's details fold in and take it off what is left to read", () => {
    const book = foldDetail(foldLists(EMPTY_SCORE_BOOK, LISTS), detailOf(listed("100", 2)));
    expect(keys(book)).toEqual(["100/4", "101/4", "102/4"]);
    expect(book.scores["100/2"]?.record).toEqual(RECORD);
  });

  test("a walk marks the charts it found played, and only those are read next", () => {
    const book = noteWalk(readInFull(), { fresh: [play("一番目", 1, 4)], stop: "known" });
    expect(keys(book)).toEqual(["100/4"]);
    expect(genresToRead(book)).toEqual([]);
  });

  test("a title two songs share is told apart by genre, or marks both", () => {
    const byGenre = noteWalk(readInFull(), { fresh: [play("同じ名前", 5, 4)], stop: "short" });
    expect(keys(byGenre)).toEqual(["102/4"]);
    const either = noteWalk(readInFull(), { fresh: [play("同じ名前", null, 4)], stop: "short" });
    expect(keys(either)).toEqual(["101/4", "102/4"]);
  });

  test("a title no list carries reads its genre's list again, then the chart it names", () => {
    const walked = noteWalk(readInFull(), { fresh: [play("新曲", 2, 4)], stop: "known" });
    expect(genresToRead(walked)).toEqual([2]);
    expect(keys(walked)).toEqual([]);

    const newSong = { songNo: "200", title: "新曲", genres: [2 as const] };
    const relisted = foldLists(walked, [
      { genre: 2, reading: { songs: [newSong], scores: [listed("200", 4)] } },
    ]);
    expect(keys(relisted)).toEqual(["200/4"]);
    expect(genresToRead(relisted)).toEqual([]);
  });

  test("a title still unlisted after its genre's list is read again is forgotten", () => {
    const walked = noteWalk(readInFull(), { fresh: [play("どこにもない", 3, 4)], stop: "known" });
    const relisted = foldLists(walked, [{ genre: 3, reading: { songs: [], scores: [] } }]);
    expect(relisted.unlisted).toEqual([]);
    expect(genresToRead(relisted)).toEqual([]);
  });

  test("a played level the lists do not name is not read: its genre's list is read again", () => {
    const book = noteWalk(readInFull(), { fresh: [play("一番目", 1, 5)], stop: "known" });
    expect(keys(book)).toEqual([]);
    expect(genresToRead(book)).toEqual([1]);
  });

  test("a walk that outran the feed calls a full read, which reads every played chart again", () => {
    const outran = noteWalk(readInFull(), { fresh: [], stop: "cap" });
    expect(genresToRead(outran)).toEqual(GENRES);
    expect(keys(foldLists(outran, LISTS))).toEqual(["100/2", "100/4", "101/4", "102/4"]);
  });

  test("a list showing another crown or rank than the details reads that chart again", () => {
    const moved = LISTS[0]?.reading.scores.map((score) =>
      score.songNo === "101" ? { ...score, crown: "gold" as const } : score,
    );
    const book = foldLists(readInFull(), [
      { genre: 1, reading: { songs: LISTS[0]?.reading.songs ?? [], scores: moved ?? [] } },
    ]);
    expect(keys(book)).toEqual(["101/4"]);
    expect(book.scores["101/4"]?.record).toEqual(RECORD);
  });

  test("an older reading never replaces a newer one", () => {
    const newer = foldDetail(readInFull(), detailOf(listed("100", 2), LATER));
    const older = foldDetail(newer, listed("100", 2));
    expect(older.scores["100/2"]?.fetchedAt).toBe(LATER);
  });

  test("places each chart where recent plays last show it, and a chart they lack nowhere", () => {
    const order = recentOrder(readInFull(), [
      play("一番目", 1, 4),
      play("同じ名前", 5, 4),
      play("一番目", 1, 4),
      play("一番目", 1, 2),
    ]);
    expect([...order.entries()]).toEqual([
      ["100/4", 0],
      ["102/4", 1],
      ["100/2", 3],
    ]);
  });

  test("a song's charts are the levels its lists name, easiest first", () => {
    expect(songCharts(readInFull(), "100").map(({ level }) => level)).toEqual([1, 2, 3, 4]);
    expect(songCharts(readInFull(), "999")).toEqual([]);
  });
});
