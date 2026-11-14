import { describe, expect, test } from "bun:test";
import { err, ok, type Transport, type TransportFailure, type TransportRequest } from "@abth/core";

import { batch, page, songbox } from "../../core/test/chinese-names-fixtures";
import { CHINESE_NAMES_URL, readChineseNames } from "../src/shared/song-catalogue";

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
