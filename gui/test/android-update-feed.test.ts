import { beforeEach, describe, expect, test } from "bun:test";

import { UPDATE_FEED_URL } from "../src/updates";
import { CLOSE_LABEL, memoryFlag } from "./android-port-fixtures";
import { native, nativeBase64 } from "./capacitor-fakes";

const { createAndroidPort } = await import("../src/platform/android");

const FEED = { version: "0.2.0", notes: { en: ["Fixed a thing"] } };

const openPort = () =>
  createAndroidPort({ closeLabel: () => CLOSE_LABEL, signedInFlag: memoryFlag(true) });

describe("the Android port's readUpdateFeed", () => {
  beforeEach(() => native.reset());

  test("reads the feed Capacitor hands over parsed, with one GET that holds no session", async () => {
    native.httpAnswer = async () => ({
      status: 200,
      url: UPDATE_FEED_URL,
      headers: { "Content-Type": "application/json" },
      data: FEED,
    });
    const port = await openPort();

    expect(await port.readUpdateFeed()).toEqual({ ok: true, value: FEED });

    expect(native.httpRequests.map(({ method, url }) => ({ method, url }))).toEqual([
      { method: "GET", url: UPDATE_FEED_URL },
    ]);
    expect(Object.keys(native.httpRequests[0]?.headers ?? {})).toEqual(["User-Agent"]);
    expect(native.cookieCalls).toEqual([]);
  });

  test("reads the feed when it comes as bytes", async () => {
    native.httpAnswer = async () => ({
      status: 200,
      url: UPDATE_FEED_URL,
      headers: { "Content-Type": "application/octet-stream" },
      data: nativeBase64(JSON.stringify(FEED)),
    });
    const port = await openPort();
    expect(await port.readUpdateFeed()).toEqual({ ok: true, value: FEED });
  });

  test("answers badAnswer to a release that has no feed", async () => {
    native.httpAnswer = async () => ({
      status: 404,
      url: UPDATE_FEED_URL,
      headers: { "Content-Type": "text/html" },
      data: "Not Found",
    });
    const port = await openPort();
    expect(await port.readUpdateFeed()).toEqual({ ok: false, error: { code: "badAnswer" } });
  });

  test("answers unreachable when the request fails", async () => {
    native.httpAnswer = () => Promise.reject(new Error("offline"));
    const port = await openPort();
    expect(await port.readUpdateFeed()).toEqual({ ok: false, error: { code: "unreachable" } });
  });
});
