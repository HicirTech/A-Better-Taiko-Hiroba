import { err, ok, type Result, type Transport } from "@abth/core";

import type { ChartFileFailure } from "./types";

// ESE's largest chart is 65 KB and OurTaiko's map 91 KB: both with room to grow.
const CHART_MAX_BYTES = 512 * 1024;
const MAPPING_MAX_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 30_000;
const MAX_PATH_LENGTH = 300;
const SONG_NO = /^\d{1,5}$/;

export interface EseChartFilesOptions {
  /** OurTaiko's map of song numbers to ESE's chart files; none in a run that reads none. */
  readonly mappingUrl: string | undefined;
  /** Where ESE serves its chart files, ending in a slash. */
  readonly chartsUrl: string | undefined;
}

/** ESE's chart files, found through OurTaiko's map; the files themselves are never kept. */
export interface EseChartFiles {
  /** Whether the run was given the map's and the files' addresses. */
  readonly configured: boolean;
  /** A song's chart file as text, read over `transport`. */
  text(transport: Transport, songNo: string): Promise<Result<string, ChartFileFailure>>;
}

const failed = (code: ChartFileFailure["code"]): Result<never, ChartFileFailure> => err({ code });

/** The chart files of one run, which reads OurTaiko's map once for every reader it serves. */
export function createEseChartFiles(options: EseChartFilesOptions): EseChartFiles {
  const { mappingUrl, chartsUrl } = options;
  // Read once a run: the songs it maps change only when OurTaiko adds some.
  let mapping: ReadonlyMap<string, string> | null = null;
  return {
    configured: mappingUrl !== undefined && chartsUrl !== undefined,
    async text(transport, songNo) {
      if (mappingUrl === undefined || chartsUrl === undefined) {
        return failed("notConfigured");
      }
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
      return textOf(transport, `${chartsUrl}${path}`, CHART_MAX_BYTES, chartsUrl);
    },
  };
}

/** One GET's text; a chart that left `within` on a redirect, or is gone, is no chart. */
async function textOf(
  transport: Transport,
  url: string,
  maxBytes: number,
  within?: string,
): Promise<Result<string, ChartFileFailure>> {
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
