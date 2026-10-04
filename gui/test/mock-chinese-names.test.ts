import { describe, expect, test } from "bun:test";
import { ok, type Transport } from "@abth/core";

import { chineseNamesBatch } from "../scripts/mock-chinese-names";
import { WIKI_SONGS } from "../scripts/mock-song-catalogue";
import { chineseNamesBySong } from "../src/favorites/chinese-names";
import { CHINESE_NAMES_URL, parseWikiSongs, readChineseNames } from "../src/song-catalogue";

const standIn: Transport = {
  send: async (request) =>
    ok({
      status: 200,
      url: request.url,
      headers: {},
      body: new TextEncoder().encode(
        JSON.stringify(chineseNamesBatch(new URL(request.url).searchParams.get("gcmcontinue"))),
      ),
    }),
};

describe("the stand-in's Chinese wiki", () => {
  test("reads, through the app's own reader, in two batches, and names its songs by title", async () => {
    const read = await readChineseNames(standIn, CHINESE_NAMES_URL, () => 1);
    const songs = parseWikiSongs(JSON.stringify(WIKI_SONGS));
    if (!read.ok || !songs.ok) {
      throw new Error("The stand-in's lists did not read");
    }
    // 1014 and 1031 share a title, so both take its names.
    expect(Object.fromEntries(chineseNamesBySong(songs.value.songs, read.value.pages))).toEqual({
      "1008": ["光之翼"],
      "1011": ["魔法少女不會入睡"],
      "1014": ["向陽之歌"],
      "1017": ["電腦少女的獨白"],
      "1022": ["地下迷宮的主題", "Dungeon Theme"],
      "1031": ["向陽之歌"],
    });
  });
});
