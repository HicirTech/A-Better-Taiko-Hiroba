import { describe, expect, test } from "bun:test";
import { err, ok, type Transport } from "@abth/core";

import { createMemoryPictureStore } from "../src/hiroba-session";
import type { Pipeline } from "../src/shared/pipelines";
import {
  createChartDensityReader,
  createChartTjaReader,
  createEseChartFiles,
} from "../src/shared/song-catalogue";

const MAPPING = "https://cdn.ourtaiko.test/api/ese_mapping";
const CHARTS = "https://ese.test/ESE/ESE/raw/branch/master/";
const PATH = "01 Pop\\Sample Song\\Sample Song.tja";
const CHART = `${CHARTS}01%20Pop/Sample%20Song/Sample%20Song.tja`;
// Hand-written: no chart from a TJA collection is kept in this repository.
const TJA = "BPM:120\nCOURSE:Oni\n#START\n1234,\n#END\n";

type Answer = Awaited<ReturnType<Transport["send"]>>;
const text = (body: string, url: string, status = 200): Answer =>
  ok({ status, url, headers: {}, body: new TextEncoder().encode(body) });

function setUp(options: { chart?: (url: string) => Answer; addresses?: boolean } = {}) {
  const sent: string[] = [];
  const transport: Transport = {
    async send({ url }) {
      sent.push(url);
      return url === MAPPING
        ? text(JSON.stringify({ "1001": PATH }), url)
        : (options.chart ?? ((asked) => text(TJA, asked)))(url);
    },
  };
  const files = createEseChartFiles({
    mappingUrl: options.addresses === false ? undefined : MAPPING,
    chartsUrl: options.addresses === false ? undefined : CHARTS,
  });
  const pipeline: Pick<Pipeline, "read"> = { read: (_asked, group) => group(transport) };
  const reader = createChartTjaReader({ pipeline, files });
  return { reader, files, pipeline, sent };
}

describe("createChartTjaReader", () => {
  test("reads a song's chart file through OurTaiko's map, as text", async () => {
    const { reader, sent } = setUp();
    expect(await reader("1001")).toEqual(ok(TJA));
    expect(sent).toEqual([MAPPING, CHART]);
  });

  test("keeps no chart: each read asks for the file again, the map read once a run", async () => {
    const { reader, sent } = setUp();
    await reader("1001");
    await reader("1001");
    expect(sent).toEqual([MAPPING, CHART, CHART]);
  });

  test("shares the map the density reader read, so the run asks for it once", async () => {
    const { reader, files, pipeline, sent } = setUp();
    const densities = createChartDensityReader({
      store: createMemoryPictureStore(),
      pipeline,
      files,
    });
    await densities("1001", false);
    await reader("1001");
    expect(sent).toEqual([MAPPING, CHART, CHART]);
  });

  test("finds no chart for a song the map does not name, or a file ESE has lost", async () => {
    const { reader } = setUp({ chart: (url) => text("Not found", url, 404) });
    expect(await reader("1002")).toEqual(err({ code: "noChart" }));
    expect(await reader("1001")).toEqual(err({ code: "noChart" }));
  });

  test("says when ESE could not be reached", async () => {
    const { reader } = setUp({ chart: (url) => err({ kind: "unreachable", url }) });
    expect(await reader("1001")).toEqual(err({ code: "unreachable" }));
  });

  test("reads nothing in a run given no addresses", async () => {
    const { reader, sent } = setUp({ addresses: false });
    expect(await reader("1001")).toEqual(err({ code: "notConfigured" }));
    expect(sent).toEqual([]);
  });
});
