import { beforeEach, describe, expect, test } from "bun:test";
import { err } from "@abth/core";

import type { DatabaseFactory } from "../src/platform/android-indexeddb";
import { CLOSE_LABEL, memoryFlag } from "./android-port-fixtures";
import { native, nativeBase64 } from "./capacitor-fakes";
import { createFakeIndexedDb } from "./indexeddb-fake";
import { FFMPEG_JPEG } from "./picture-fixtures";

const { createAndroidPort } = await import("../src/platform/android");

const FILE = "https://file.taiko.wiki/fumen/670/oni";
const JPEG_VIEW = {
  src: expect.stringMatching(/^data:image\/jpeg;base64,\/9j\/4AAQ/),
  width: 300,
  height: 20,
};

const openPort = (indexedDb?: DatabaseFactory) =>
  createAndroidPort({
    closeLabel: () => CLOSE_LABEL,
    signedInFlag: memoryFlag(true),
    ...(indexedDb !== undefined && { indexedDb }),
  });

describe("the Android port's readChartPicture", () => {
  beforeEach(() => {
    native.reset();
    native.httpAnswer = async () => ({
      status: 200,
      url: FILE,
      headers: {},
      data: nativeBase64(FFMPEG_JPEG),
    });
  });

  test("reads the picture with one GET that carries no session, and touches no cookie", async () => {
    const port = await openPort();
    expect(await port.readChartPicture(FILE)).toEqual({ ok: true, value: JPEG_VIEW });
    expect(native.httpRequests.map(({ method, url }) => ({ method, url }))).toEqual([
      { method: "GET", url: FILE },
    ]);
    expect(Object.keys(native.httpRequests[0]?.headers ?? {})).toEqual(["User-Agent"]);
    expect(native.cookieCalls).toEqual([]);
  });

  test("answers a picture it kept with no request, and so after a relaunch", async () => {
    const indexedDb = createFakeIndexedDb();
    const first = await openPort(indexedDb.factory);
    const read = await first.readChartPicture(FILE);
    expect(read.ok).toBe(true);
    expect(await first.readChartPicture(FILE)).toEqual(read);

    const relaunched = await openPort(indexedDb.factory);
    expect(await relaunched.readChartPicture(FILE)).toEqual(read);
    expect(native.httpRequests).toHaveLength(1);
  });

  test("keeps chart pictures in a database of their own, beside the pictures'", async () => {
    const indexedDb = createFakeIndexedDb();
    const opened: string[] = [];
    const factory: DatabaseFactory = {
      open: (name, version) => {
        opened.push(name);
        return indexedDb.factory.open(name, version);
      },
    };
    await (await openPort(factory)).readChartPicture(FILE);
    expect([...opened].sort()).toEqual(["abth-charts", "abth-pictures"]);
  });

  test("reads nothing at an address off the chart hosts, a stand-in's included", async () => {
    const port = await openPort();
    const refused = err({ code: "chart=notAllowed" });
    for (const address of [
      "https://evil.test/a.png",
      "http://file.taiko.wiki/fumen/670/oni",
      "http://hiroba.127.0.0.1.sslip.io:8807/__charts/1001/oni-1.png",
    ]) {
      expect(await port.readChartPicture(address)).toEqual(refused);
    }
    expect(native.httpRequests).toEqual([]);
  });

  test("answers a failed request, a missing picture and a page as codes", async () => {
    const port = await openPort();
    native.httpAnswer = () => Promise.reject(new Error("offline"));
    expect(await port.readChartPicture(FILE)).toEqual({
      ok: false,
      error: { code: "chart=unreachable" },
    });
    native.httpAnswer = async () => ({ status: 404, url: FILE, headers: {}, data: "Not Found" });
    expect(await port.readChartPicture(FILE)).toEqual({
      ok: false,
      error: { code: "chart=status-404" },
    });
    native.httpAnswer = async () => ({
      status: 200,
      url: FILE,
      headers: { "Content-Type": "text/html" },
      data: nativeBase64("<html>Sign in</html>"),
    });
    expect(await port.readChartPicture(FILE)).toEqual({
      ok: false,
      error: { code: "chart=notPicture" },
    });
  });
});
