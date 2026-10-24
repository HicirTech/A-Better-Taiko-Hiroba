import { describe, expect, test } from "bun:test";
import { type ChartDensity, err, ok, type Transport } from "@abth/core";

import {
  createMemoryPictureStore,
  PICTURE_EPOCH,
  type PictureKey,
  type PictureStore,
} from "../src/hiroba-session";
import { createChartDensityReader, createEseChartFiles } from "../src/shared/song-catalogue";
import { mappingOf } from "../src/shared/song-catalogue/ese-chart-files";

const MAPPING = "https://cdn.ourtaiko.test/api/ese_mapping";
const CHARTS = "https://ese.test/ESE/ESE/raw/branch/master/";
const PATH = "01 Pop\\Sample Song\\Sample Song.tja";
const CHART = `${CHARTS}01%20Pop/Sample%20Song/Sample%20Song.tja`;
// Hand-written: no chart from a TJA collection is kept in this repository.
const TJA = "BPM:120\nCOURSE:Oni\n#START\n1234,\n#END\nCOURSE:Easy\n#START\n1,\n#END\n";
const ONI: ChartDensity = { branched: false, line: { notes: 4, seconds: 1.5, perSecond: [2, 2] } };
const EASY: ChartDensity = { branched: false, line: { notes: 1, seconds: 0, perSecond: [1] } };
const KEY: PictureKey = { scope: "shared", player: null, name: `${PICTURE_EPOCH}/density/1001` };

type Answer = Awaited<ReturnType<Transport["send"]>>;
const text = (body: string, url: string, status = 200): Answer =>
  ok({ status, url, headers: {}, body: new TextEncoder().encode(body) });

function setUp(
  options: {
    mapping?: string;
    chart?: (url: string) => Answer;
    store?: PictureStore;
    addresses?: boolean;
  } = {},
) {
  const sent: string[] = [];
  const transport: Transport = {
    async send({ url }) {
      sent.push(url);
      return url === MAPPING
        ? text(options.mapping ?? JSON.stringify({ "1001": PATH }), url)
        : (options.chart ?? ((asked) => text(TJA, asked)))(url);
    },
  };
  const store = options.store ?? createMemoryPictureStore();
  const reader = createChartDensityReader({
    store,
    pipeline: { read: (_asked, group) => group(transport) },
    files: createEseChartFiles({
      mappingUrl: options.addresses === false ? undefined : MAPPING,
      chartsUrl: options.addresses === false ? undefined : CHARTS,
    }),
  });
  return { reader, sent, store };
}

describe("createChartDensityReader", () => {
  test("reads a song's chart through OurTaiko's map and gives each difficulty's density", async () => {
    const { reader, sent } = setUp();
    expect(await reader("1001", false)).toEqual(ok({ oni: ONI, easy: EASY }));
    expect(sent).toEqual([MAPPING, CHART]);
  });

  test("answers from the numbers it kept, with no request, until it is asked to read again", async () => {
    const { reader, sent } = setUp();
    await reader("1001", false);
    expect(await reader("1001", false)).toEqual(ok({ oni: ONI, easy: EASY }));
    expect(sent).toEqual([MAPPING, CHART]);
    expect(await reader("1001", true)).toEqual(ok({ oni: ONI, easy: EASY }));
    expect(sent).toEqual([MAPPING, CHART, CHART]);
  });

  test("keeps the numbers alone, never the chart's text", async () => {
    const { reader, store } = setUp();
    await reader("1001", false);
    const kept = new TextDecoder().decode((await store.get(KEY)) ?? new Uint8Array());
    expect(JSON.parse(kept)).toEqual({ v: 1, densities: { oni: ONI, easy: EASY } });
    expect(kept).not.toContain("#START");
  });

  test.each<[why: string, kept: unknown]>([
    ["an older shape", { v: 0, densities: { oni: ONI } }],
    ["a difficulty the game has not", { v: 1, densities: { extreme: ONI } }],
    ["a line that is no line", { v: 1, densities: { oni: { branched: false, line: [2, 2] } } }],
  ])("reads a song again when what it kept has %s", async (_why, kept) => {
    const store = createMemoryPictureStore();
    await store.put(KEY, new TextEncoder().encode(JSON.stringify(kept)));
    const { reader, sent } = setUp({ store });
    expect(await reader("1001", false)).toEqual(ok({ oni: ONI, easy: EASY }));
    expect(sent).toEqual([MAPPING, CHART]);
  });

  test("finds no chart for a song the map does not name, and reads no file", async () => {
    const { reader, sent } = setUp();
    expect(await reader("1002", false)).toEqual(err({ code: "noChart" }));
    expect(sent).toEqual([MAPPING]);
  });

  test.each<[why: string, chart: (url: string) => Answer]>([
    ["is gone", (url) => text("", url, 404)],
    ["moved off ESE", () => text(TJA, "https://elsewhere.test/Sample%20Song.tja")],
  ])("finds no chart for a song whose file %s", async (_why, chart) => {
    const { reader } = setUp({ chart });
    expect(await reader("1001", false)).toEqual(err({ code: "noChart" }));
  });

  test.each<[why: string, chart: (url: string) => Answer]>([
    ["holds no chart", (url) => text("TITLE:Nothing\n", url)],
    ["answers with a server error", (url) => text("", url, 500)],
    ["is too large to be a chart", (url) => text("1".repeat(512 * 1024 + 1), url)],
  ])("calls a file that %s a bad answer", async (_why, chart) => {
    const { reader } = setUp({ chart });
    expect(await reader("1001", false)).toEqual(err({ code: "badAnswer" }));
  });

  test.each(["{}", "[]", "not json", JSON.stringify({ "1001": "../Sample Song.tja" })])(
    "calls a map of %p, which names no chart it can read, a bad answer",
    async (mapping) => {
      const { reader } = setUp({ mapping });
      expect(await reader("1001", false)).toEqual(err({ code: "badAnswer" }));
    },
  );

  test("says when ESE could not be reached", async () => {
    const { reader } = setUp({ chart: (url) => err({ kind: "unreachable", url }) });
    expect(await reader("1001", false)).toEqual(err({ code: "unreachable" }));
  });

  test("reads nothing in a run given no addresses", async () => {
    const { reader, sent } = setUp({ addresses: false });
    expect(await reader("1001", false)).toEqual(err({ code: "notConfigured" }));
    expect(sent).toEqual([]);
  });
});

describe("mappingOf", () => {
  test("puts ESE's paths into addresses and drops any that could step out of it", () => {
    const mapping = mappingOf(
      JSON.stringify({
        "1": "09 Namco Original\\Tenjiku 2000\\Tenjiku 2000.tja",
        "2": "..\\Elsewhere.tja",
        "3": "01 Pop/Song/Song.txt",
        "4": "01 Pop//Song.tja",
        five: "01 Pop\\Song\\Song.tja",
        "6": 6,
      }),
    );
    expect(mapping).toEqual(
      new Map([["1", "09%20Namco%20Original/Tenjiku%202000/Tenjiku%202000.tja"]]),
    );
  });
});
