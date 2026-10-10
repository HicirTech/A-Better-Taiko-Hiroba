import { describe, expect, test } from "bun:test";
import { err, ok, type Result, type Transport } from "@abth/core";

import { createSessionWrites } from "../src/hiroba-session";
import { afterRefresh } from "../src/read-again/after-refresh";
import type { ReadFailure } from "../src/session-port";

const ORIGIN = "https://hiroba.test";
const ENDPOINTS = {
  hirobaOrigin: ORIGIN,
  idpHost: "id.test",
  idpDomain: "id.test",
  imgOrigin: null,
};
const NOON_JST = () => new Date("2026-09-27T03:00:00Z");
const TOKEN = "f".repeat(32);

const answered = (path: string, type: string, body: string) =>
  ok({
    status: 200,
    url: `${ORIGIN}/${path}`,
    headers: { "content-type": type },
    body: new TextEncoder().encode(body),
  });

/** Hiroba that serves my page's token, and answers the ↻ with `result`. */
function hirobaAnswering(result: number) {
  const sent: string[] = [];
  const transport: Transport = {
    async send(request) {
      const path = new URL(request.url).pathname.slice(1);
      sent.push(`${request.method} ${path}`);
      return request.method === "GET"
        ? answered(path, "text/html", `<input type="hidden" id="_tckt" value="${TOKEN}" />`)
        : answered(path, "application/json", JSON.stringify({ result }));
    },
  };
  return { transport, sent };
}

function refreshing(transport: Transport, signedIn = true) {
  const writes = createSessionWrites({
    endpoints: ENDPOINTS,
    platform: "desktop",
    now: NOON_JST,
    historyStore: { load: async () => [], save: async () => undefined },
    recentPreview: () => null,
    signedIn: () => signedIn,
    endSession: () => undefined,
    owner: () => null,
    costumeChanged: () => undefined,
  });
  return () => writes.refreshHiroba(transport);
}

describe("afterRefresh", () => {
  test("reads once Hiroba has refreshed", async () => {
    let reads = 0;
    const read = async (): Promise<Result<string, ReadFailure>> => {
      reads += 1;
      return ok("page");
    };

    const result = await afterRefresh({ refreshHiroba: async () => ok(undefined) }, read);

    expect(result).toEqual(ok("page"));
    expect(reads).toBe(1);
  });

  test("gives a refresh that failed as the read's failure, and reads nothing", async () => {
    let reads = 0;
    const failure: ReadFailure = { kind: "notRefreshed", detail: "result=901" };

    const result = await afterRefresh({ refreshHiroba: async () => err(failure) }, async () => {
      reads += 1;
      return ok("page");
    });

    expect(result).toEqual(err(failure));
    expect(reads).toBe(0);
  });
});

describe("createSessionWrites, the refresh", () => {
  test("reads my page for its token, then posts the ↻ once", async () => {
    const { transport, sent } = hirobaAnswering(0);

    expect(await refreshing(transport)()).toEqual(ok(undefined));
    expect(sent).toEqual(["GET mypage_top.php", "POST ajax/update_score.php"]);
  });

  test("answers Hiroba's result as the refresh's failure, with the result in its codes", async () => {
    const { transport } = hirobaAnswering(901);

    const refreshed = await refreshing(transport)();

    expect(!refreshed.ok && refreshed.error.kind).toBe("notRefreshed");
    expect(!refreshed.ok && refreshed.error.detail).toStartWith("result=901 ");
  });

  test("asks Hiroba nothing while signed out", async () => {
    const { transport, sent } = hirobaAnswering(0);

    expect(await refreshing(transport, false)()).toEqual(err({ kind: "notSignedIn" }));
    expect(sent).toEqual([]);
  });
});
