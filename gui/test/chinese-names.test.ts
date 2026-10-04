import { describe, expect, test } from "bun:test";
import { err, ok, type Transport, type TransportFailure, type TransportRequest } from "@abth/core";

import {
  CHINESE_NAMES_URL,
  officialNames,
  parseChineseNamesBatch,
  readChineseNames,
} from "../src/song-catalogue";

const songbox = (official: string) =>
  `{{Songbox\n|released = [[2004年]]\n|id = 10tai\n|official = ${official}\n|default = Tentai Kansoku\n|genre = POPS\n}}\n'''本文'''`;

const page = (title: string, content: string) => ({
  title,
  revisions: [{ slots: { main: { contentmodel: "wikitext", content } } }],
});

const batch = (pages: unknown[], next?: Record<string, string>) =>
  JSON.stringify({
    batchcomplete: true,
    ...(next === undefined ? {} : { continue: next }),
    query: { pages },
  });

describe("officialNames", () => {
  test("reads one name", () => {
    expect(officialNames(songbox("天體觀測"))).toEqual(["天體觀測"]);
  });

  test("splits names at line breaks, and drops footnotes, links and markup", () => {
    const field =
      'I\'m mecha。<ref>於《[[太鼓之達人11 亞洲版]]》的譯名。</ref><br/>Mecha DESU.<ref name="a" /><br>[[天竺|天竺2000]]';
    expect(officialNames(songbox(field))).toEqual(["I'm mecha。", "Mecha DESU.", "天竺2000"]);
  });

  test("reads a field that runs onto later lines, up to the next field", () => {
    expect(
      officialNames("{{Songbox\n|official = 喀啦喀啦碰之歌<br>\n妖怪碰碰之歌\n|genre = 童謠\n}}"),
    ).toEqual(["喀啦喀啦碰之歌", "妖怪碰碰之歌"]);
  });

  test("gives none for an empty field, or a box without one", () => {
    expect(officialNames(songbox(""))).toEqual([]);
    expect(officialNames("{{Songbox\n|id = 1ps\n}}")).toEqual([]);
  });
});

describe("parseChineseNamesBatch", () => {
  test("reads each page's title and names, and the fields that ask for the next batch", () => {
    const next = { gcmcontinue: "page|33|10196", continue: "gcmcontinue||" };
    expect(parseChineseNamesBatch(batch([page("天体観測", songbox("天體觀測"))], next))).toEqual(
      ok({ pages: [{ title: "天体観測", names: ["天體觀測"] }], next }),
    );
  });

  test("ends after a batch with no continuation, and skips a page without content", () => {
    expect(parseChineseNamesBatch(batch([{ title: "曲ID" }]))).toEqual(
      ok({ pages: [], next: null }),
    );
  });

  test.each([
    "<html>Not found</html>",
    "[]",
    JSON.stringify({ error: { code: "badvalue" } }),
    JSON.stringify({ continue: { "gcm continue": "x" }, query: { pages: [] } }),
    JSON.stringify({ continue: { gcmcontinue: 1 }, query: { pages: [] } }),
  ])("answers badAnswer to %p", (text) => {
    expect(parseChineseNamesBatch(text)).toEqual(err({ code: "badAnswer" }));
  });
});

function answering(...bodies: string[]) {
  const asked: TransportRequest[] = [];
  const transport: Transport = {
    send: async (request) => {
      asked.push(request);
      const body = bodies[asked.length - 1] ?? batch([]);
      return ok({
        status: 200,
        url: request.url,
        headers: {},
        body: new TextEncoder().encode(body),
      });
    },
  };
  return { asked, transport };
}

describe("readChineseNames", () => {
  test("sends nothing and says so when there is no address", async () => {
    const { asked, transport } = answering();
    expect(await readChineseNames(transport, undefined)).toEqual(err({ code: "notConfigured" }));
    expect(asked).toEqual([]);
  });

  test("follows the continuation batch by batch, and keeps only pages that name the song", async () => {
    const next = { gcmcontinue: "page|33|10196", continue: "gcmcontinue||" };
    const { asked, transport } = answering(
      batch([page("天体観測", songbox("天體觀測")), page("曲ID", "本文")], next),
      batch([page("ゲラゲラポーのうた", songbox("喀啦喀啦碰之歌"))]),
    );
    expect(await readChineseNames(transport, CHINESE_NAMES_URL, () => 1_700_000_000_000)).toEqual(
      ok({
        pages: [
          { title: "天体観測", names: ["天體觀測"] },
          { title: "ゲラゲラポーのうた", names: ["喀啦喀啦碰之歌"] },
        ],
        sentAt: 1_700_000_000_000,
      }),
    );
    const first = new URL(asked[0]?.url ?? "");
    const second = new URL(asked[1]?.url ?? "");
    expect(asked).toHaveLength(2);
    expect(first.searchParams.get("gcmtitle")).toBe("Category:按照曲ID排列");
    expect(first.searchParams.get("rvsection")).toBe("0");
    expect(first.searchParams.has("gcmcontinue")).toBe(false);
    expect(second.searchParams.get("gcmcontinue")).toBe("page|33|10196");
  });

  test("stops a wiki that never ends its continuation", async () => {
    const next = { gcmcontinue: "again", continue: "gcmcontinue||" };
    const endless: Transport = {
      send: async (request) =>
        ok({
          status: 200,
          url: request.url,
          headers: {},
          body: new TextEncoder().encode(batch([], next)),
        }),
    };
    expect(await readChineseNames(endless, CHINESE_NAMES_URL)).toEqual(err({ code: "badAnswer" }));
  });

  type FailureCase = [kind: TransportFailure["kind"], code: "unreachable" | "timedOut"];
  test.each<FailureCase>([
    ["unreachable", "unreachable"],
    ["timedOut", "timedOut"],
    ["cancelled", "timedOut"],
  ])("answers %s as the code %s", async (kind, code) => {
    const transport: Transport = { send: async (request) => err({ kind, url: request.url }) };
    expect(await readChineseNames(transport, CHINESE_NAMES_URL)).toEqual(err({ code }));
  });

  test("answers badAnswer to a status other than 200", async () => {
    const transport: Transport = {
      send: async (request) =>
        ok({ status: 503, url: request.url, headers: {}, body: new Uint8Array() }),
    };
    expect(await readChineseNames(transport, CHINESE_NAMES_URL)).toEqual(
      err({ code: "badAnswer" }),
    );
  });
});
