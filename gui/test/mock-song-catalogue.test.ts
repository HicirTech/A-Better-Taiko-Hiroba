import { describe, expect, test } from "bun:test";
import { isOk } from "@abth/core";

import { WIKI_SONGS, wikiSongsSince } from "../scripts/mock-song-catalogue";
import { parseWikiSongs } from "../src/song-catalogue";

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
    expect(wikiSongsSince(null)).toBe(WIKI_SONGS);
  });

  test("gives a fixed pair for any time: a listed song, changed, and the deleted one", () => {
    const pair = wikiSongsSince("1780000000000");
    expect(wikiSongsSince("1")).toEqual(pair);
    expect(pair).toHaveLength(2);
    const [changed, deleted] = pair;
    const listed = WIKI_SONGS.find(({ songNo }) => songNo === changed?.songNo);
    expect(listed).toBeDefined();
    expect(changed).not.toEqual(listed);
    expect(deleted?.isDeleted).toBe(1);
    expect(readByApp(pair).removed).toEqual([deleted?.songNo ?? ""]);
  });
});
