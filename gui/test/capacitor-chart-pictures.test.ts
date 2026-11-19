import { beforeEach, describe, expect, test } from "bun:test";

import type { DatabaseFactory } from "../src/platform/capacitor-indexeddb";
import { native, nativeBase64 } from "./capacitor-fakes";
import { CLOSE_LABEL, memoryFlag } from "./capacitor-port-fixtures";
import { createFakeIndexedDb } from "./indexeddb-fake";
import { FFMPEG_JPEG } from "./picture-fixtures";

const { createCapacitorPort } = await import("../src/platform/capacitor");

const FILE = "https://file.taiko.wiki/fumen/670/oni";
const JPEG_VIEW = {
  src: expect.stringMatching(/^data:image\/jpeg;base64,\/9j\/4AAQ/),
  width: 300,
  height: 20,
};

const openPort = (indexedDb?: DatabaseFactory) =>
  createCapacitorPort({
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
    expect(await port.readChartPicture(FILE, "any")).toEqual({ ok: true, value: JPEG_VIEW });
    expect(native.httpRequests.map(({ method, url }) => ({ method, url }))).toEqual([
      { method: "GET", url: FILE },
    ]);
    expect(Object.keys(native.httpRequests[0]?.headers ?? {})).toEqual(["User-Agent"]);
    expect(native.cookieCalls).toEqual([]);
  });

  test("keeps chart pictures, drawn charts and the numbers read from charts, in databases of their own", async () => {
    const indexedDb = createFakeIndexedDb();
    const opened: string[] = [];
    const factory: DatabaseFactory = {
      open: (name, version) => {
        opened.push(name);
        return indexedDb.factory.open(name, version);
      },
    };
    await (await openPort(factory)).readChartPicture(FILE, "any");
    // The pipelines' histories load as the port starts.
    expect([...opened].sort()).toEqual([
      "abth-charts",
      "abth-densities",
      "abth-drawn-charts",
      "abth-pictures",
      "abth-pipelines",
    ]);
  });
});
