import { describe, expect, test } from "bun:test";
import { err, type Genre, ok } from "@abth/core";

import { type CatalogueSong, MAX_CATALOGUE_LENGTH, parseWikiSongs } from "../src/song-catalogue";

const wikiEntry = (fields: Record<string, unknown> = {}) => ({
  songNo: "1001",
  title: "サンプル曲",
  titleEn: "Sample Song",
  titleZhCN: "示例曲",
  romaji: "sanpuru kyoku",
  artists: ["Sample Artist"],
  genre: ["pops"],
  isDeleted: 0,
  courses: {
    easy: { level: 2 },
    normal: { level: 3 },
    hard: { level: 5 },
    oni: { level: 7 },
    ura: null,
  },
  ...fields,
});

const SAMPLE: CatalogueSong = {
  songNo: "1001",
  title: "サンプル曲",
  titleEn: "Sample Song",
  titleZh: "示例曲",
  romaji: "sanpuru kyoku",
  artists: ["Sample Artist"],
  genres: [1],
  levels: { easy: 2, normal: 3, hard: 5, oni: 7, ura: null },
};
const NO_LEVELS = { easy: null, normal: null, hard: null, oni: null, ura: null };

const read = (...entries: unknown[]) => parseWikiSongs(JSON.stringify(entries));
const readOne = (fields: Record<string, unknown>) => read(wikiEntry(fields));
const expectSong = (fields: Record<string, unknown>, changes: Partial<CatalogueSong>) =>
  expect(readOne(fields)).toEqual(ok({ songs: [{ ...SAMPLE, ...changes }], removed: [] }));

describe("parseWikiSongs", () => {
  test("reads a song with the titles, artists, genres and levels the app keeps", () => {
    expect(read(wikiEntry())).toEqual(ok({ songs: [SAMPLE], removed: [] }));
  });

  test("keeps the songs in the order of the answer", () => {
    const second = wikiEntry({ songNo: "1002", title: "二曲目" });
    expect(read(second, wikiEntry())).toEqual(
      ok({ songs: [{ ...SAMPLE, songNo: "1002", title: "二曲目" }, SAMPLE], removed: [] }),
    );
  });

  test("trims the title", () => {
    expectSong({ title: "  サンプル曲　" }, {});
  });

  type GenreCase = [name: string, number: Genre];
  test.each<GenreCase>([
    ["pops", 1],
    ["anime", 2],
    ["kids", 3],
    ["vocaloid", 4],
    ["game", 5],
    ["namco", 6],
    ["variety", 7],
    ["classic", 8],
  ])("reads the genre %p as Hiroba's number %p", (name, number) => {
    expectSong({ genre: [name] }, { genres: [number] });
  });

  test("keeps the genres in the wiki's order, once each, and drops those it does not know", () => {
    expectSong({ genre: ["classic", "pops", "jazz", "classic", 3, null] }, { genres: [8, 1] });
  });

  type NoGenreCase = [why: string, genre: unknown];
  test.each<NoGenreCase>([
    ["there is no genre", undefined],
    ["the genre is text", "pops"],
    ["the genre is null", null],
    ["the list is empty", []],
  ])("keeps no genre when %s", (_why, genre) => {
    expectSong({ genre }, { genres: [] });
  });

  type TitlesCase = [why: string, fields: Record<string, unknown>, kept: Partial<CatalogueSong>];
  const NO_OTHER_TITLES = { titleEn: null, titleZh: null, romaji: null };
  test.each<TitlesCase>([
    ["the wiki has none", { titleEn: null, titleZhCN: null, romaji: null }, NO_OTHER_TITLES],
    [
      "they are missing",
      { titleEn: undefined, titleZhCN: undefined, romaji: undefined },
      NO_OTHER_TITLES,
    ],
    [
      "they only repeat the Japanese title",
      { titleEn: "サンプル曲", titleZhCN: "サンプル曲", romaji: "サンプル曲" },
      NO_OTHER_TITLES,
    ],
    ["they are blank", { titleEn: " ", titleZhCN: "", romaji: "\n\t" }, NO_OTHER_TITLES],
    ["they are not text", { titleEn: 1, titleZhCN: ["示例曲"], romaji: {} }, NO_OTHER_TITLES],
    [
      "they have spaces around them",
      { titleEn: " Sample Song ", titleZhCN: "\t示例曲", romaji: "sanpuru kyoku " },
      {},
    ],
  ])("keeps the other titles right when %s", (_why, fields, kept) => {
    expectSong(fields, kept);
  });

  type ArtistsCase = [why: string, artists: unknown, kept: string[]];
  test.each<ArtistsCase>([
    [
      "it lists some that are not text",
      ["First", "", "  ", 3, null, " Second "],
      ["First", "Second"],
    ],
    ["it lists none", [], []],
    ["the list is text", "First", []],
    ["there is no list", undefined, []],
  ])("keeps the artists right when %s", (_why, artists, kept) => {
    expectSong({ artists }, { artists: kept });
  });

  type LevelCase = [level: unknown, kept: number | null];
  test.each<LevelCase>([
    [1, 1],
    [10, 10],
    [0, null],
    [11, null],
    [-1, null],
    [2.5, null],
    ["5", null],
    [null, null],
  ])("reads the level %p of a chart as %p", (level, kept) => {
    expectSong({ courses: { oni: { level } } }, { levels: { ...NO_LEVELS, oni: kept } });
  });

  test("reads the ura along with the other charts", () => {
    const courses = {
      easy: { level: 1 },
      normal: { level: 2 },
      hard: { level: 4 },
      oni: { level: 8 },
      ura: { level: 10 },
    };
    expectSong({ courses }, { levels: { easy: 1, normal: 2, hard: 4, oni: 8, ura: 10 } });
  });

  type CoursesCase = [why: string, courses: unknown];
  test.each<CoursesCase>([
    ["there are no charts", undefined],
    ["the charts are null", null],
    ["the charts are a list", [{ level: 5 }]],
    ["the charts are text", "oni"],
    ["a chart is null", { oni: null }],
    ["a chart has no level", { oni: {} }],
  ])("has no levels when %s", (_why, courses) => {
    expectSong({ courses }, { levels: NO_LEVELS });
  });

  test.each(["ns2_sample", "", "123456", "12a", " 1001", "-1", "1.5", "１００１"])(
    "skips the song numbered %p",
    (songNo) => {
      expect(readOne({ songNo })).toEqual(ok({ songs: [], removed: [] }));
    },
  );

  test.each(["1", "00001", "99999"])("keeps the song numbered %p", (songNo) => {
    expectSong({ songNo }, { songNo });
  });

  test.each([
    ["a number", 1001],
    ["null", null],
    ["missing", undefined],
  ])("skips a song whose number is %s", (_why, songNo) => {
    expect(readOne({ songNo })).toEqual(ok({ songs: [], removed: [] }));
  });

  test("lists a deleted song's number as removed, and not as a song", () => {
    expect(read(wikiEntry({ songNo: "1002", isDeleted: 1 }), wikiEntry())).toEqual(
      ok({ songs: [SAMPLE], removed: ["1002"] }),
    );
  });

  test("lists a deleted song as removed even when the rest of it cannot be read", () => {
    expect(readOne({ songNo: "1002", isDeleted: 1, title: null, genre: 5 })).toEqual(
      ok({ songs: [], removed: ["1002"] }),
    );
  });

  test("does not list a console-only song as removed", () => {
    expect(readOne({ songNo: "ns2_sample", isDeleted: 1 })).toEqual(ok({ songs: [], removed: [] }));
  });

  test.each([0, "1", true, null, 2])("does not take isDeleted %p as deleted", (isDeleted) => {
    expect(readOne({ isDeleted })).toEqual(ok({ songs: [SAMPLE], removed: [] }));
  });

  test("skips an entry that does not fit, and keeps the rest", () => {
    const malformed = [
      null,
      5,
      "1001",
      [],
      {},
      wikiEntry({ title: "" }),
      wikiEntry({ title: " " }),
      wikiEntry({ title: 3 }),
      wikiEntry({ title: undefined }),
    ];
    const second = wikiEntry({ songNo: "1002", title: "二曲目" });
    expect(read(...malformed, second)).toEqual(
      ok({ songs: [{ ...SAMPLE, songNo: "1002", title: "二曲目" }], removed: [] }),
    );
  });

  test("takes an empty list as no songs", () => {
    expect(parseWikiSongs("[]")).toEqual(ok({ songs: [], removed: [] }));
  });

  type RefusedCase = [why: string, text: string];
  test.each<RefusedCase>([
    ["an object", "{}"],
    ["an object that holds the list", JSON.stringify({ songs: [wikiEntry()] })],
    ["null", "null"],
    ["text", '"[]"'],
    ["a number", "1"],
    ["text that is not JSON", "[{"],
    ["an HTML page", "<html>Not found</html>"],
    ["nothing", ""],
  ])("answers badAnswer to %s", (_why, text) => {
    expect(parseWikiSongs(text)).toEqual(err({ code: "badAnswer" }));
  });

  test("reads text of MAX_CATALOGUE_LENGTH characters and refuses one more", () => {
    const paddedTo = (length: number) => `[${" ".repeat(length - 2)}]`;
    expect(parseWikiSongs(paddedTo(MAX_CATALOGUE_LENGTH))).toEqual(ok({ songs: [], removed: [] }));
    expect(parseWikiSongs(paddedTo(MAX_CATALOGUE_LENGTH + 1))).toEqual(err({ code: "badAnswer" }));
  });
});
