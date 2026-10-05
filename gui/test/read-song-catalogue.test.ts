import { describe, expect, test } from "bun:test";
import { err, ok, type Transport, type TransportFailure, type TransportRequest } from "@abth/core";

import {
  type CatalogueSong,
  readSongCatalogue,
  SONG_CATALOGUE_URL,
  type SongCatalogueFailure,
} from "../src/song-catalogue";

const ANSWER = JSON.stringify([
  { songNo: "1001", title: "サンプル曲", artists: [], genre: ["pops"], isDeleted: 0, courses: {} },
  { songNo: "1002", isDeleted: 1 },
]);
const SONG: CatalogueSong = {
  songNo: "1001",
  title: "サンプル曲",
  titleEn: null,
  titleZh: null,
  romaji: null,
  artists: [],
  genres: [1],
  levels: { easy: null, normal: null, hard: null, oni: null, ura: null },
  bpm: null,
  charts: { easy: null, normal: null, hard: null, oni: null, ura: null },
};
const SENT_AT = 1_780_000_000_000;
const SINCE = 1_779_000_000_000;

function answering(status: number, body: string) {
  const asked: { request: TransportRequest; signal: AbortSignal | undefined }[] = [];
  const transport: Transport = {
    send: async (request, signal) => {
      asked.push({ request, signal });
      return ok({ status, url: request.url, headers: {}, body: new TextEncoder().encode(body) });
    },
  };
  return { asked, transport };
}

describe("readSongCatalogue", () => {
  test("sends nothing and says so when there is no address", async () => {
    const { asked, transport } = answering(200, ANSWER);
    expect(await readSongCatalogue(transport, undefined, null, () => SENT_AT)).toEqual(
      err({ code: "notConfigured" }),
    );
    expect(asked).toEqual([]);
  });

  test("reads every song with one GET, under a timeout, when there is no read before", async () => {
    const { asked, transport } = answering(200, ANSWER);
    const read = await readSongCatalogue(transport, SONG_CATALOGUE_URL, null, () => SENT_AT);
    expect(read).toEqual(ok({ songs: [SONG], removed: ["1002"], sentAt: SENT_AT }));
    expect(asked.map(({ request }) => request)).toEqual([
      { method: "GET", url: SONG_CATALOGUE_URL },
    ]);
    expect(asked[0]?.signal?.aborted).toBe(false);
  });

  test("asks only for what changed since the read before", async () => {
    const { asked, transport } = answering(200, ANSWER);
    await readSongCatalogue(transport, SONG_CATALOGUE_URL, SINCE, () => SENT_AT);
    expect(asked.map(({ request }) => request.url)).toEqual([
      `${SONG_CATALOGUE_URL}?after=${SINCE}`,
    ]);
  });

  test("keeps the query the address already has", async () => {
    const { asked, transport } = answering(200, ANSWER);
    await readSongCatalogue(transport, "http://wiki.test/songs?lang=ja", SINCE, () => SENT_AT);
    expect(asked.map(({ request }) => request.url)).toEqual([
      `http://wiki.test/songs?lang=ja&after=${SINCE}`,
    ]);
  });

  test("stamps the time the request went out, not the time the answer came", async () => {
    let clock = SENT_AT;
    const transport: Transport = {
      send: async (request) => {
        clock += 60_000;
        const body = new TextEncoder().encode(ANSWER);
        return ok({ status: 200, url: request.url, headers: {}, body });
      },
    };
    const read = await readSongCatalogue(transport, SONG_CATALOGUE_URL, null, () => clock);
    expect(read).toEqual(ok({ songs: [SONG], removed: ["1002"], sentAt: SENT_AT }));
  });

  type FailureCase = [kind: TransportFailure["kind"], code: SongCatalogueFailure["code"]];
  test.each<FailureCase>([
    ["unreachable", "unreachable"],
    ["timedOut", "timedOut"],
    ["cancelled", "timedOut"],
  ])("answers %s as the code %s", async (kind, code) => {
    const transport: Transport = { send: async (request) => err({ kind, url: request.url }) };
    expect(await readSongCatalogue(transport, SONG_CATALOGUE_URL, null)).toEqual(err({ code }));
  });

  test.each([404, 500, 304])("answers badAnswer to the status %d", async (status) => {
    const { transport } = answering(status, ANSWER);
    expect(await readSongCatalogue(transport, SONG_CATALOGUE_URL, null)).toEqual(
      err({ code: "badAnswer" }),
    );
  });

  test.each(["<html>Not found</html>", "{}", ""])("answers badAnswer to %p", async (body) => {
    const { transport } = answering(200, body);
    expect(await readSongCatalogue(transport, SONG_CATALOGUE_URL, null)).toEqual(
      err({ code: "badAnswer" }),
    );
  });
});
