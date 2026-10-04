import { describe, expect, test } from "bun:test";
import { err, ok, type Transport, type TransportFailure, type TransportRequest } from "@abth/core";

import { createUpdateFeedTransport } from "../electron/update-feed-transport";
import { readUpdateFeed, UPDATE_FEED_URL, type UpdateFeedFailure } from "../src/updates";

const FEED = { version: "0.2.0", notes: { en: ["Fixed a thing"], "zh-Hans": ["修复了一个问题"] } };
const UA = "Mozilla/5.0 (test) Chrome/152.0.0.0 Safari/537.36";

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

describe("readUpdateFeed", () => {
  test("sends nothing and says so when there is no address", async () => {
    const { asked, transport } = answering(200, JSON.stringify(FEED));
    expect(await readUpdateFeed(transport, undefined)).toEqual(err({ code: "notConfigured" }));
    expect(asked).toEqual([]);
  });

  test("reads the feed with one GET, under a timeout", async () => {
    const { asked, transport } = answering(200, JSON.stringify(FEED));
    expect(await readUpdateFeed(transport, UPDATE_FEED_URL)).toEqual(ok(FEED));
    expect(asked.map(({ request }) => request)).toEqual([{ method: "GET", url: UPDATE_FEED_URL }]);
    expect(asked[0]?.signal?.aborted).toBe(false);
  });

  type FailureCase = [kind: TransportFailure["kind"], code: UpdateFeedFailure["code"]];
  test.each<FailureCase>([
    ["unreachable", "unreachable"],
    ["timedOut", "timedOut"],
    ["cancelled", "timedOut"],
  ])("answers %s as the code %s", async (kind, code) => {
    const transport: Transport = { send: async (request) => err({ kind, url: request.url }) };
    expect(await readUpdateFeed(transport, UPDATE_FEED_URL)).toEqual(err({ code }));
  });

  test.each([404, 500, 304])("answers badAnswer to the status %d", async (status) => {
    const { transport } = answering(status, JSON.stringify(FEED));
    expect(await readUpdateFeed(transport, UPDATE_FEED_URL)).toEqual(err({ code: "badAnswer" }));
  });

  test.each(["<html>Not found</html>", "{}", ""])("answers badAnswer to %p", async (body) => {
    const { transport } = answering(200, body);
    expect(await readUpdateFeed(transport, UPDATE_FEED_URL)).toEqual(err({ code: "badAnswer" }));
  });
});

describe("createUpdateFeedTransport", () => {
  const ASSET_URL = "https://assets.test/update.json";

  test("follows the redirect, and sends no cookie, even to a host that sets the session's", async () => {
    const sent: { url: string; headers: Record<string, string> }[] = [];
    const fetchHop = async (url: string, init: RequestInit) => {
      sent.push({ url, headers: { ...(init.headers as Record<string, string>) } });
      return url === UPDATE_FEED_URL
        ? new Response(null, {
            status: 302,
            headers: { location: ASSET_URL, "set-cookie": "_token_v2=leaked; Path=/" },
          })
        : new Response(JSON.stringify(FEED), { status: 200 });
    };
    const transport = createUpdateFeedTransport({
      userAgent: UA,
      hirobaOrigin: new URL(UPDATE_FEED_URL).origin,
      fetch: fetchHop,
    });

    expect(await readUpdateFeed(transport, UPDATE_FEED_URL)).toEqual(ok(FEED));
    expect(await readUpdateFeed(transport, UPDATE_FEED_URL)).toEqual(ok(FEED));

    expect(sent.map(({ url }) => url)).toEqual([
      UPDATE_FEED_URL,
      ASSET_URL,
      UPDATE_FEED_URL,
      ASSET_URL,
    ]);
    expect(sent.map(({ headers }) => Object.keys(headers))).toEqual(Array(4).fill(["User-Agent"]));
  });
});
