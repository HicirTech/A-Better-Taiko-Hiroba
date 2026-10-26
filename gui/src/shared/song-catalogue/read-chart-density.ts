import {
  type ChartDensity,
  err,
  type NoteDensity,
  ok,
  type Result,
  tjaDensities,
} from "@abth/core";
import { PICTURE_EPOCH, type PictureKey, type PictureStore } from "../picture-store";
import { type GroupAsked, type Pipeline, resultFailure } from "../pipelines";
import type { EseChartFiles } from "./ese-chart-files";
import { LEVEL_DIFFICULTY } from "./genre-look";
import {
  type ChartFileFailure,
  type Difficulty,
  isDifficulty,
  type SongDensityRead,
} from "./types";

/** The operation a song's chart read runs as in the pipeline for other sites. */
export const CHART_DENSITY_OPERATION = "chartDensity";
const CHART_DENSITY: GroupAsked<Result<SongDensityRead, ChartFileFailure>> = {
  operation: CHART_DENSITY_OPERATION,
  failureOf: resultFailure,
};

const MAX_SECONDS = 3600;
/** Bumped when the kept numbers change shape, so a song kept before is read again. */
const KEPT_VERSION = 1;

export interface ChartDensityReaderOptions {
  /** Where each song's numbers are kept; the chart files themselves never are. */
  readonly store: PictureStore;
  /** The pipeline for sites other than Hiroba: each read is a group in it. */
  readonly pipeline: Pick<Pipeline, "read">;
  readonly files: EseChartFiles;
}

export type ChartDensityReader = (
  songNo: string,
  again: boolean,
) => Promise<Result<SongDensityRead, ChartFileFailure>>;

/** A song's note density, read from its ESE chart once and then from the numbers kept. */
export function createChartDensityReader(options: ChartDensityReaderOptions): ChartDensityReader {
  const { store, pipeline, files } = options;
  const inFlight = new Map<string, Promise<Result<SongDensityRead, ChartFileFailure>>>();

  const read = async (
    songNo: string,
    again: boolean,
  ): Promise<Result<SongDensityRead, ChartFileFailure>> => {
    if (!files.configured) {
      return err({ code: "notConfigured" });
    }
    const key: PictureKey = {
      scope: "shared",
      player: null,
      name: `${PICTURE_EPOCH}/density/${songNo}`,
    };
    const kept = again ? null : keptDensities(await store.get(key));
    if (kept !== null) {
      return ok(kept);
    }
    return pipeline.read(CHART_DENSITY, async (transport) => {
      const chart = await files.text(transport, songNo);
      if (!chart.ok) {
        return chart;
      }
      const densities = densitiesByDifficulty(chart.value);
      if (Object.keys(densities).length === 0) {
        return err({ code: "badAnswer" });
      }
      await store.put(key, new TextEncoder().encode(densityFile(densities)));
      return ok(densities);
    });
  };

  return (songNo, again) => {
    const onItsWay = inFlight.get(songNo);
    if (onItsWay !== undefined) {
      return onItsWay;
    }
    const reading = read(songNo, again).finally(() => inFlight.delete(songNo));
    inFlight.set(songNo, reading);
    return reading;
  };
}

/** A song's numbers as the apps keep them and ABTH CDN publishes them. */
export const densityFile = (densities: SongDensityRead): string =>
  JSON.stringify({ v: KEPT_VERSION, densities });

/** Every single-player chart's note density in a TJA's text, by difficulty. */
export function densitiesByDifficulty(text: string): SongDensityRead {
  const densities: Partial<Record<Difficulty, ChartDensity>> = {};
  for (const [level, density] of tjaDensities(text)) {
    densities[LEVEL_DIFFICULTY[level]] = density;
  }
  return densities;
}

/** The numbers kept for a song, or null for nothing kept, or a shape kept before KEPT_VERSION. */
export function keptDensities(bytes: Uint8Array | null): SongDensityRead | null {
  if (bytes === null) {
    return null;
  }
  try {
    const kept: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return isRecord(kept) && kept.v === KEPT_VERSION && isSongDensities(kept.densities)
      ? kept.densities
      : null;
  } catch {
    return null;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isSongDensities(value: unknown): value is SongDensityRead {
  const entries = isRecord(value) ? Object.entries(value) : [];
  return (
    entries.length > 0 &&
    entries.every(([difficulty, density]) => isDifficulty(difficulty) && isChartDensity(density))
  );
}

function isChartDensity(value: unknown): value is ChartDensity {
  if (!isRecord(value)) {
    return false;
  }
  if (value.branched === false) {
    return isNoteDensity(value.line);
  }
  return (
    value.branched === true &&
    isRecord(value.lines) &&
    isNoteDensity(value.lines.normal) &&
    isNoteDensity(value.lines.advanced) &&
    isNoteDensity(value.lines.master)
  );
}

function isNoteDensity(value: unknown): value is NoteDensity {
  return (
    isRecord(value) &&
    Number.isInteger(value.notes) &&
    typeof value.seconds === "number" &&
    value.seconds >= 0 &&
    value.seconds <= MAX_SECONDS &&
    Array.isArray(value.perSecond) &&
    value.perSecond.length <= MAX_SECONDS + 1 &&
    value.perSecond.every((count) => Number.isInteger(count) && count >= 0)
  );
}
