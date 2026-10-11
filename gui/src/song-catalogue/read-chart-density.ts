import {
  type ChartDensity,
  err,
  type NoteDensity,
  ok,
  type Result,
  type Transport,
  tjaDensities,
} from "@abth/core";

import { LEVEL_DIFFICULTY } from "../favorites/genre-look";
import { PICTURE_EPOCH, type PictureKey, type PictureStore } from "../hiroba-session/picture-store";
import { type GroupAsked, type Pipeline, resultFailure } from "../pipelines";
import {
  type ChartDensityFailure,
  DIFFICULTIES,
  type Difficulty,
  type SongDensityRead,
} from "./types";

/** The operation a song's chart read runs as in the pipeline for other sites. */
export const CHART_DENSITY_OPERATION = "chartDensity";
const CHART_DENSITY: GroupAsked<Result<SongDensityRead, ChartDensityFailure>> = {
  operation: CHART_DENSITY_OPERATION,
  failureOf: resultFailure,
};

// ESE's largest chart is 65 KB and OurTaiko's map 91 KB: both with room to grow.
const CHART_MAX_BYTES = 512 * 1024;
const MAPPING_MAX_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 30_000;
const MAX_PATH_LENGTH = 300;
const MAX_SECONDS = 3600;
const SONG_NO = /^\d{1,5}$/;
/** Bumped when the kept numbers change shape, so a song kept before is read again. */
const KEPT_VERSION = 1;

export interface ChartDensityReaderOptions {
  /** Where each song's numbers are kept; the chart files themselves never are. */
  readonly store: PictureStore;
  /** The pipeline for sites other than Hiroba: each read is a group in it. */
  readonly pipeline: Pick<Pipeline, "read">;
  /** OurTaiko's map of song numbers to ESE's chart files; none in a run that reads none. */
  readonly mappingUrl: string | undefined;
  /** Where ESE serves its chart files, ending in a slash. */
  readonly chartsUrl: string | undefined;
}

export type ChartDensityReader = (
  songNo: string,
  again: boolean,
) => Promise<Result<SongDensityRead, ChartDensityFailure>>;

const failed = (code: ChartDensityFailure["code"]): Result<never, ChartDensityFailure> =>
  err({ code });

/** A song's note density, read from its ESE chart once and then from the numbers kept. */
export function createChartDensityReader(options: ChartDensityReaderOptions): ChartDensityReader {
  const { store, pipeline, mappingUrl, chartsUrl } = options;
  // Read once a run: the songs it maps change only when OurTaiko adds some.
  let mapping: ReadonlyMap<string, string> | null = null;
  const inFlight = new Map<string, Promise<Result<SongDensityRead, ChartDensityFailure>>>();

  const read = async (
    songNo: string,
    again: boolean,
  ): Promise<Result<SongDensityRead, ChartDensityFailure>> => {
    if (mappingUrl === undefined || chartsUrl === undefined) {
      return failed("notConfigured");
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
      if (mapping === null) {
        const answer = await textOf(transport, mappingUrl, MAPPING_MAX_BYTES);
        if (!answer.ok) {
          return answer;
        }
        mapping = mappingOf(answer.value);
        if (mapping === null) {
          return failed("badAnswer");
        }
      }
      const path = mapping.get(songNo);
      if (path === undefined) {
        return failed("noChart");
      }
      const chart = await textOf(transport, `${chartsUrl}${path}`, CHART_MAX_BYTES, chartsUrl);
      if (!chart.ok) {
        return chart;
      }
      const densities = densitiesByDifficulty(chart.value);
      if (Object.keys(densities).length === 0) {
        return failed("badAnswer");
      }
      await store.put(
        key,
        new TextEncoder().encode(JSON.stringify({ v: KEPT_VERSION, densities })),
      );
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

/** One GET's text; a chart that left `within` on a redirect, or is gone, is no chart. */
async function textOf(
  transport: Transport,
  url: string,
  maxBytes: number,
  within?: string,
): Promise<Result<string, ChartDensityFailure>> {
  const sent = await transport.send({ method: "GET", url }, AbortSignal.timeout(TIMEOUT_MS));
  if (!sent.ok) {
    return failed(sent.error.kind === "unreachable" ? "unreachable" : "timedOut");
  }
  const { status, url: endedAt, body } = sent.value;
  if (within !== undefined && (status === 404 || !endedAt.startsWith(within))) {
    return failed("noChart");
  }
  if (status !== 200 || body.byteLength > maxBytes) {
    return failed("badAnswer");
  }
  return ok(new TextDecoder().decode(body));
}

/** OurTaiko's map, each path made safe to put after ESE's address, or null when it holds none. */
export function mappingOf(text: string): ReadonlyMap<string, string> | null {
  let answer: unknown;
  try {
    answer = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof answer !== "object" || answer === null || Array.isArray(answer)) {
    return null;
  }
  const mapping = new Map<string, string>();
  for (const [songNo, path] of Object.entries(answer)) {
    const address = typeof path === "string" && SONG_NO.test(songNo) ? chartAddress(path) : null;
    if (address !== null) {
      mapping.set(songNo, address);
    }
  }
  return mapping.size > 0 ? mapping : null;
}

/** A TJA's path in ESE as part of an address, or null for one that could step out of it. */
function chartAddress(path: string): string | null {
  const parts = path.trim().split(/[\\/]/);
  const steps = parts.some((part) => part === "" || part === "." || part === "..");
  return path.length > MAX_PATH_LENGTH || steps || !/\.tja$/i.test(path)
    ? null
    : parts.map(encodeURIComponent).join("/");
}

function densitiesByDifficulty(text: string): SongDensityRead {
  const densities: Partial<Record<Difficulty, ChartDensity>> = {};
  for (const [level, density] of tjaDensities(text)) {
    densities[LEVEL_DIFFICULTY[level]] = density;
  }
  return densities;
}

/** The numbers kept for a song, or null for nothing kept, or a shape kept before KEPT_VERSION. */
function keptDensities(bytes: Uint8Array | null): SongDensityRead | null {
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

const isDifficulty = (value: string): value is Difficulty =>
  (DIFFICULTIES as readonly string[]).includes(value);

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
