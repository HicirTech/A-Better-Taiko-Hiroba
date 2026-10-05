import { describe, expect, test } from "bun:test";
import { isOk } from "@abth/core";

import { CHART_PICTURE_PATHS, WIKI_SONGS, wikiSongsSince } from "../scripts/mock-song-catalogue";
import { DIFFICULTIES, parseWikiSongs } from "../src/song-catalogue";

const ORIGIN = "http://hiroba.test:8807";

function readByApp(songs: readonly unknown[]) {
  const read = parseWikiSongs(JSON.stringify(songs));
  if (!isOk(read)) {
    throw new Error("The app cannot read the stand-in's song list.");
  }
  return read.value;
}

describe("the mock's song list", () => {
  const read = readByApp(WIKI_SONGS);

  test("holds about forty songs, numbered from 1001", () => {
    expect(WIKI_SONGS).toHaveLength(40);
    expect(WIKI_SONGS[0]?.songNo).toBe("1001");
    expect(read.songs.every(({ songNo }) => Number(songNo) >= 1001)).toBe(true);
  });

  test("is read by the app, which skips the console-only song and drops the deleted one", () => {
    expect(WIKI_SONGS.map(({ songNo }) => songNo)).toContain("ns2_sample");
    expect(read.songs).toHaveLength(WIKI_SONGS.length - 2);
    expect(read.removed).toEqual(["1039"]);
  });

  test("covers all eight genres", () => {
    expect(new Set(read.songs.flatMap(({ genres }) => genres))).toEqual(
      new Set([1, 2, 3, 4, 5, 6, 7, 8]),
    );
  });

  test("has songs with an ura, and songs with each of the other titles", () => {
    expect(read.songs.some(({ levels }) => levels.ura !== null)).toBe(true);
    expect(read.songs.some(({ levels }) => levels.ura === null)).toBe(true);
    expect(read.songs.some(({ titleEn }) => titleEn !== null)).toBe(true);
    expect(read.songs.some(({ titleZh }) => titleZh !== null)).toBe(true);
    expect(read.songs.some(({ romaji }) => romaji !== null)).toBe(true);
  });

  test("has two songs of one title in different genres", () => {
    const sharing = read.songs.filter(({ title }) => title === "ひだまりのうた");
    expect(sharing.map(({ genres }) => genres)).toEqual([[3], [7]]);
  });
});

describe("wikiSongsSince", () => {
  test("gives the whole list when no time is named", () => {
    const songNos = (songs: readonly { songNo: string }[]) => songs.map(({ songNo }) => songNo);
    expect(songNos(wikiSongsSince(null, ORIGIN))).toEqual(songNos(WIKI_SONGS));
  });

  test("gives a fixed pair for any time: a listed song, changed, and the deleted one", () => {
    const pair = wikiSongsSince("1780000000000", ORIGIN);
    expect(wikiSongsSince("1", ORIGIN)).toEqual(pair);
    expect(pair).toHaveLength(2);
    const [changed, deleted] = pair;
    const listed = WIKI_SONGS.find(({ songNo }) => songNo === changed?.songNo);
    expect(listed).toBeDefined();
    expect(changed).not.toEqual(listed);
    expect(deleted?.isDeleted).toBe(1);
    expect(readByApp(pair).removed).toEqual([deleted?.songNo ?? ""]);
  });
});

describe("the mock's chart pictures", () => {
  const read = readByApp(wikiSongsSince(null, ORIGIN));
  const linked = read.songs.flatMap((song) =>
    DIFFICULTIES.flatMap((difficulty) =>
      (song.charts[difficulty]?.images ?? []).map(
        (address) => [song.songNo, difficulty, address] as const,
      ),
    ),
  );

  test("go to song 1001's every chart, 1005's oni (two) and ura, and 1019's oni", () => {
    expect(linked).toEqual([
      ["1001", "easy", `${ORIGIN}/__charts/1001/easy-1.png`],
      ["1001", "normal", `${ORIGIN}/__charts/1001/normal-1.png`],
      ["1001", "hard", `${ORIGIN}/__charts/1001/hard-1.png`],
      ["1001", "oni", `${ORIGIN}/__charts/1001/oni-1.png`],
      ["1005", "oni", `${ORIGIN}/__charts/1005/oni-1.png`],
      ["1005", "oni", `${ORIGIN}/__charts/1005/oni-2.png`],
      ["1005", "ura", `${ORIGIN}/__charts/1005/ura-1.png`],
      ["1019", "oni", `${ORIGIN}/__charts/1019/oni-1.png`],
    ]);
  });

  test("are served at the paths the list links, each once, and linked on the origin given", () => {
    expect(linked.map(([, , address]) => address.slice(ORIGIN.length))).toEqual([
      ...CHART_PICTURE_PATHS,
    ]);
    expect(new Set(CHART_PICTURE_PATHS).size).toBe(CHART_PICTURE_PATHS.length);
    const other = readByApp(wikiSongsSince(null, "http://hiroba.example:9"));
    expect(other.songs.find(({ songNo }) => songNo === "1019")?.charts.oni?.images).toEqual([
      "http://hiroba.example:9/__charts/1019/oni-1.png",
    ]);
  });
});
