import { describe, expect, test } from "bun:test";
import { err, ok, type Result } from "@abth/core";

import type { HirobaSessionPort, PictureView } from "../src/shared/session-port";
import type { ChartFileFailure, Difficulty } from "../src/shared/song-catalogue/types";
import { type ChartFinding, findChartPicture, reloadCharts } from "../src/songs/find-chart-picture";
import { png } from "./picture-fixtures";

const WIKI = "https://file.taiko.wiki/fumen/1001/oni";
// Hand-written: no chart from a TJA collection is kept in this repository.
const TJA = "BPM:120\nCOURSE:Oni\n#START\n1234,\n#END\n";
const DRAWN = png(816, 300);
const KEPT_DRAWING: PictureView = {
  src: "data:image/png;base64,a2VwdA==",
  width: 816,
  height: 200,
};
const WIKI_VIEW: PictureView = { src: "data:image/png;base64,d2lraQ==", width: 816, height: 400 };

type ChartPort = Pick<HirobaSessionPort, "readChartPicture" | "readDrawnChart" | "keepDrawnChart">;

/** The port's chart verbs over what it holds, recording what it is asked. */
function fakePort(held: { drawn?: PictureView; wikiKept?: boolean } = {}) {
  const asked: string[] = [];
  const kept: { songNo: string; difficulty: Difficulty; png: Uint8Array }[] = [];
  const port: ChartPort = {
    async readDrawnChart(songNo, difficulty) {
      asked.push(`drawn ${songNo} ${difficulty}`);
      return held.drawn ?? null;
    },
    async keepDrawnChart(songNo, difficulty, png) {
      kept.push({ songNo, difficulty, png });
    },
    async readChartPicture(url, read) {
      asked.push(`picture ${read} ${url}`);
      return read === "kept" && held.wikiKept !== true
        ? err({ code: "chart=notKept" })
        : ok(WIKI_VIEW);
    },
  };
  return { port, asked, kept };
}

function finding(
  port: ChartPort,
  tja: Result<string, ChartFileFailure> = ok(TJA),
  drawn: Uint8Array | null = DRAWN,
) {
  const reads = { tja: 0, draws: 0 };
  const chart: ChartFinding = {
    songNo: "1001",
    difficulty: "oni",
    images: [WIKI],
    port,
    tja: async () => {
      reads.tja += 1;
      return tja;
    },
    draw: async () => {
      reads.draws += 1;
      return drawn;
    },
  };
  return { chart, reads };
}

describe("findChartPicture", () => {
  test("shows the kept drawing, reading no chart file", async () => {
    const { port, asked } = fakePort({ drawn: KEPT_DRAWING });
    const { chart, reads } = finding(port);
    expect(await findChartPicture(chart)).toEqual({ kind: "drawn", picture: KEPT_DRAWING });
    expect(asked).toEqual(["drawn 1001 oni"]);
    expect(reads).toEqual({ tja: 0, draws: 0 });
  });

  test("shows taiko.wiki's pictures already kept until the chart is drawn, reading no file", async () => {
    const { port, asked } = fakePort({ wikiKept: true });
    const { chart, reads } = finding(port);
    expect(await findChartPicture(chart)).toEqual({ kind: "wiki", noTja: false });
    expect(asked).toEqual(["drawn 1001 oni", `picture kept ${WIKI}`]);
    expect(reads).toEqual({ tja: 0, draws: 0 });
  });

  test("draws a chart nothing is kept for, keeps the drawing and shows it", async () => {
    const { port, kept } = fakePort();
    const { chart, reads } = finding(port);
    expect(await findChartPicture(chart)).toEqual({
      kind: "drawn",
      picture: { src: expect.stringMatching(/^data:image\/png;base64,/), width: 816, height: 300 },
    });
    expect(kept).toEqual([{ songNo: "1001", difficulty: "oni", png: DRAWN }]);
    expect(reads).toEqual({ tja: 1, draws: 1 });
  });

  test("draws a chart without taiko.wiki pictures as well", async () => {
    const { port, asked } = fakePort();
    const { chart } = finding(port);
    const shown = await findChartPicture({ ...chart, images: [] });
    expect(shown.kind).toBe("drawn");
    expect(asked).toEqual(["drawn 1001 oni"]);
  });

  test.each<[why: string, failure: ChartFileFailure["code"]]>([
    ["a song ESE has no chart file for", "noChart"],
    ["a run given no chart files", "notConfigured"],
  ])("falls back to taiko.wiki's pictures, and says so, for %s", async (_why, code) => {
    const { port, kept } = fakePort();
    const { chart, reads } = finding(port, err({ code }));
    expect(await findChartPicture(chart)).toEqual({ kind: "wiki", noTja: true });
    expect(kept).toEqual([]);
    expect(reads.draws).toBe(0);
  });

  test("falls back to taiko.wiki's pictures for a chart the file cannot draw", async () => {
    const { port, kept } = fakePort();
    const { chart } = finding(port, ok(TJA), null);
    expect(await findChartPicture(chart)).toEqual({ kind: "wiki", noTja: true });
    expect(kept).toEqual([]);
  });

  test("reports a chart file it could not read this time, with its code", async () => {
    const { port } = fakePort();
    const { chart } = finding(port, err({ code: "unreachable" }));
    expect(await findChartPicture(chart)).toEqual({ kind: "failed", code: "unreachable" });
  });
});

describe("reloadCharts", () => {
  const charts = [
    { difficulty: "hard", images: ["https://file.taiko.wiki/fumen/1001/hard"] },
    { difficulty: "oni", images: [WIKI] },
  ] as const;

  test("draws every chart again from a fresh chart file and keeps each, fetching no picture", async () => {
    const { port, asked, kept } = fakePort({ drawn: KEPT_DRAWING });
    let fresh = 0;
    await reloadCharts({
      songNo: "1001",
      charts,
      source: "tja",
      port,
      tja: async () => {
        fresh += 1;
        return ok(TJA);
      },
      draw: async () => DRAWN,
    });
    expect(fresh).toBe(1);
    expect(kept.map(({ difficulty }) => difficulty)).toEqual(["hard", "oni"]);
    expect(asked).toEqual([]);
  });

  test("reads taiko.wiki's pictures anew when they are the pictures shown", async () => {
    const { port, asked, kept } = fakePort();
    await reloadCharts({
      songNo: "1001",
      charts,
      source: "wiki",
      port,
      tja: async () => ok(TJA),
      draw: async () => DRAWN,
    });
    expect(asked).toEqual([
      "picture again https://file.taiko.wiki/fumen/1001/hard",
      `picture again ${WIKI}`,
    ]);
    expect(kept).toEqual([]);
  });

  test("reads anew the taiko.wiki pictures of a chart it cannot draw", async () => {
    const { port, asked, kept } = fakePort();
    await reloadCharts({
      songNo: "1001",
      charts,
      source: "tja",
      port,
      tja: async () => ok(TJA),
      draw: async (_tja, difficulty) => (difficulty === "oni" ? DRAWN : null),
    });
    expect(kept.map(({ difficulty }) => difficulty)).toEqual(["oni"]);
    expect(asked).toEqual(["picture again https://file.taiko.wiki/fumen/1001/hard"]);
  });
});
