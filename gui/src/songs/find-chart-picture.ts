import type { Result } from "@abth/core";

import type { HirobaSessionPort, PictureView } from "../shared/session-port";
import type { ChartSource } from "../shared/song-catalogue/chart-source";
import { viewOf } from "../shared/song-catalogue/read-chart-picture";
import type { ChartFileFailure, Difficulty } from "../shared/song-catalogue/types";

/** What a song's details show for a chart. */
export type ChartShown =
  | { readonly kind: "drawn"; readonly picture: PictureView }
  /** taiko.wiki's pictures; `lacking` names the source that had no drawing of the chart. */
  | { readonly kind: "wiki"; readonly lacking: "tja" | "cdn" | null }
  | { readonly kind: "failed"; readonly code: string };

/** The failures that mean the song has no chart file, rather than one not read this time. */
const NO_TJA: ReadonlySet<ChartFileFailure["code"]> = new Set(["noChart", "notConfigured"]);

type ChartPort = Pick<
  HirobaSessionPort,
  "readChartPicture" | "readCdnChart" | "readDrawnChart" | "keepDrawnChart"
>;

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
    return { kind: "wiki", lacking: null };
  }

  return drawNow(finding);
}

/** ABTH CDN's drawing of the chart, kept or read now, else taiko.wiki's pictures. */
export async function findCdnPicture(
  port: Pick<HirobaSessionPort, "readCdnChart">,
  songNo: string,
  difficulty: Difficulty,
): Promise<ChartShown> {
  const drawing = await port.readCdnChart(songNo, difficulty, "any");
  if (drawing.ok) {
    return { kind: "drawn", picture: drawing.value };
  }
  // A 404 is a chart ESE lacks too; a drawing that only failed to come this time gets no note.
  return { kind: "wiki", lacking: drawing.error.code === "chart=status-404" ? "cdn" : null };
}

async function drawNow(finding: ChartFinding): Promise<ChartShown> {
  const tja = await finding.tja();
  if (!tja.ok) {
    return NO_TJA.has(tja.error.code)
      ? { kind: "wiki", lacking: "tja" }
      : { kind: "failed", code: tja.error.code };
  }

  const png = await finding.draw(tja.value, finding.difficulty);
  const view = png === null ? null : viewOf(png);
  if (png === null || view === null || !view.ok) {
    return { kind: "wiki", lacking: "tja" };
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

/** Each chart of a song read anew from its source, or taiko.wiki's pictures where none is drawn. */
export async function reloadCharts(reload: SongReload): Promise<void> {
  const { songNo, charts, port } = reload;
  const tja = reload.source === "tja" ? await reload.tja() : null;
  for (const { difficulty, images } of charts) {
    if (reload.source === "cdn" && (await port.readCdnChart(songNo, difficulty, "again")).ok) {
      continue;
    }
    const png = tja?.ok ? await reload.draw(tja.value, difficulty) : null;
    if (png !== null) {
      await port.keepDrawnChart(songNo, difficulty, png);
    } else {
      await Promise.all(images.map((url) => port.readChartPicture(url, "again")));
    }
  }
}
