import { describe, expect, test } from "bun:test";
import { err, ok, type Result } from "@abth/core";

import type { HirobaSessionPort, PictureView } from "../src/shared/session-port";
import type { ChartFileFailure, Difficulty } from "../src/shared/song-catalogue/types";
import {
  type ChartFinding,
  findCdnPicture,
  findChartPicture,
  reloadCharts,
} from "../src/songs/find-chart-picture";
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
const CDN_VIEW: PictureView = { src: "data:image/webp;base64,Y2Ru", width: 816, height: 240 };

type ChartPort = Pick<
  HirobaSessionPort,
  "readChartPicture" | "readCdnChart" | "readDrawnChart" | "keepDrawnChart"
>;

/** The port's chart verbs over what it holds, recording what it is asked. */
function fakePort(
  held: {
    drawn?: PictureView;
    wikiKept?: boolean;
    /** The failure ABTH CDN answers for a chart; the others it has. */
    cdnFails?: Partial<Record<Difficulty, string>>;
  } = {},
) {
  const asked: string[] = [];
  const kept: { songNo: string; difficulty: Difficulty; png: Uint8Array }[] = [];
  const port: ChartPort = {
    async readCdnChart(songNo, difficulty, read) {
      asked.push(`cdn ${read} ${songNo} ${difficulty}`);
      const code = held.cdnFails?.[difficulty];
      return code === undefined ? ok(CDN_VIEW) : err({ code });
    },
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
    expect(await findChartPicture(chart)).toEqual({ kind: "wiki", lacking: null });
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
    expect(await findChartPicture(chart)).toEqual({ kind: "wiki", lacking: "tja" });
    expect(kept).toEqual([]);
    expect(reads.draws).toBe(0);
  });

  test("falls back to taiko.wiki's pictures for a chart the file cannot draw", async () => {
    const { port, kept } = fakePort();
    const { chart } = finding(port, ok(TJA), null);
    expect(await findChartPicture(chart)).toEqual({ kind: "wiki", lacking: "tja" });
    expect(kept).toEqual([]);
  });

  test("reports a chart file it could not read this time, with its code", async () => {
    const { port } = fakePort();
    const { chart } = finding(port, err({ code: "unreachable" }));
    expect(await findChartPicture(chart)).toEqual({ kind: "failed", code: "unreachable" });
  });
});

describe("findCdnPicture", () => {
  test("shows ABTH CDN's drawing, kept or read now", async () => {
    const { port, asked } = fakePort();
    expect(await findCdnPicture(port, "1001", "oni")).toEqual({ kind: "drawn", picture: CDN_VIEW });
    expect(asked).toEqual(["cdn any 1001 oni"]);
  });

  test("falls back to taiko.wiki's pictures, and says so, for a chart ABTH CDN has not", async () => {
    const { port } = fakePort({ cdnFails: { oni: "chart=status-404" } });
    expect(await findCdnPicture(port, "1001", "oni")).toEqual({ kind: "wiki", lacking: "cdn" });
  });

  test.each(["chart=unreachable", "chart=timedOut", "chart=status-503", "chart=notConfigured"])(
    "falls back to taiko.wiki's pictures, saying nothing, for a drawing read as %s",
    async (code) => {
      const { port } = fakePort({ cdnFails: { oni: code } });
      expect(await findCdnPicture(port, "1001", "oni")).toEqual({ kind: "wiki", lacking: null });
    },
  );
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

  test("reads ABTH CDN's drawings anew, reading no chart file and no taiko.wiki picture", async () => {
    const { port, asked, kept } = fakePort();
    let fresh = 0;
    await reloadCharts({
      songNo: "1001",
      charts,
      source: "cdn",
      port,
      tja: async () => {
        fresh += 1;
        return ok(TJA);
      },
      draw: async () => DRAWN,
    });
    expect(asked).toEqual(["cdn again 1001 hard", "cdn again 1001 oni"]);
    expect(fresh).toBe(0);
    expect(kept).toEqual([]);
  });

  test("reads anew the taiko.wiki pictures of a chart ABTH CDN has not", async () => {
    const { port, asked, kept } = fakePort({ cdnFails: { hard: "chart=status-404" } });
    await reloadCharts({
      songNo: "1001",
      charts,
      source: "cdn",
      port,
      tja: async () => ok(TJA),
      draw: async () => DRAWN,
    });
    expect(asked).toEqual([
      "cdn again 1001 hard",
      "picture again https://file.taiko.wiki/fumen/1001/hard",
      "cdn again 1001 oni",
    ]);
    expect(kept).toEqual([]);
  });
});
