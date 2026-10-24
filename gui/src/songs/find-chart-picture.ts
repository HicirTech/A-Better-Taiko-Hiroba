import type { Result } from "@abth/core";

import type { HirobaSessionPort, PictureView } from "../shared/session-port";
import { viewOf } from "../shared/song-catalogue/read-chart-picture";
import type { ChartFileFailure, Difficulty } from "../shared/song-catalogue/types";
import type { ChartSource } from "./chart-source";

/** What a song's details show for a chart. */
export type ChartShown =
  | { readonly kind: "drawn"; readonly picture: PictureView }
  /** taiko.wiki's pictures; `noTja` where there was no chart file to draw from. */
  | { readonly kind: "wiki"; readonly noTja: boolean }
  | { readonly kind: "failed"; readonly code: string };

/** The failures that mean the song has no chart file, rather than one not read this time. */
const NO_TJA: ReadonlySet<ChartFileFailure["code"]> = new Set(["noChart", "notConfigured"]);

type ChartPort = Pick<HirobaSessionPort, "readChartPicture" | "readDrawnChart" | "keepDrawnChart">;

/** Draws a chart of a TJA as a PNG, or answers null for one it cannot draw. */
export type DrawChart = (tja: string, difficulty: Difficulty) => Promise<Uint8Array | null>;

export interface ChartFinding {
  readonly songNo: string;
  readonly difficulty: Difficulty;
  /** taiko.wiki's pictures of the chart. */
  readonly images: readonly string[];
  readonly port: ChartPort;
  /** The song's chart file. */
  readonly tja: () => Promise<Result<string, ChartFileFailure>>;
  readonly draw: DrawChart;
}

/** The chart's kept drawing, else its kept taiko.wiki pictures, else a drawing made now. */
export async function findChartPicture(finding: ChartFinding): Promise<ChartShown> {
  const { songNo, difficulty, images, port } = finding;
  const drawn = await port.readDrawnChart(songNo, difficulty);
  if (drawn !== null) {
    return { kind: "drawn", picture: drawn };
  }

  const [first] = images;
  if (first !== undefined && (await port.readChartPicture(first, "kept")).ok) {
    return { kind: "wiki", noTja: false };
  }

  return drawNow(finding);
}

async function drawNow(finding: ChartFinding): Promise<ChartShown> {
  const tja = await finding.tja();
  if (!tja.ok) {
    return NO_TJA.has(tja.error.code)
      ? { kind: "wiki", noTja: true }
      : { kind: "failed", code: tja.error.code };
  }

  const png = await finding.draw(tja.value, finding.difficulty);
  const view = png === null ? null : viewOf(png);
  if (png === null || view === null || !view.ok) {
    return { kind: "wiki", noTja: true };
  }

  await finding.port.keepDrawnChart(finding.songNo, finding.difficulty, png);
  return { kind: "drawn", picture: view.value };
}

export interface SongReload {
  readonly songNo: string;
  /** Each chart of the song, with taiko.wiki's pictures of it. */
  readonly charts: readonly {
    readonly difficulty: Difficulty;
    readonly images: readonly string[];
  }[];
  readonly source: ChartSource;
  readonly port: ChartPort;
  /** The song's chart file, read anew. */
  readonly tja: () => Promise<Result<string, ChartFileFailure>>;
  readonly draw: DrawChart;
}

/** Every chart of a song drawn anew from its TJA and kept, or its taiko.wiki pictures read anew. */
export async function reloadCharts(reload: SongReload): Promise<void> {
  const { songNo, charts, port } = reload;
  const tja = reload.source === "tja" ? await reload.tja() : null;
  for (const { difficulty, images } of charts) {
    const png = tja?.ok ? await reload.draw(tja.value, difficulty) : null;
    if (png !== null) {
      await port.keepDrawnChart(songNo, difficulty, png);
    } else {
      await Promise.all(images.map((url) => port.readChartPicture(url, "again")));
    }
  }
}
