import { err, type Result } from "@abth/core";

import { type GroupAsked, type Pipeline, resultFailure } from "../pipelines";
import type { EseChartFiles } from "./ese-chart-files";
import type { ChartFileFailure } from "./types";

/** The operation a song's chart file, read for drawing, runs as in the pipeline for other sites. */
export const CHART_TJA_OPERATION = "chartTja";
const CHART_TJA: GroupAsked<Result<string, ChartFileFailure>> = {
  operation: CHART_TJA_OPERATION,
  failureOf: resultFailure,
};

export interface ChartTjaReaderOptions {
  /** The pipeline for sites other than Hiroba: each read is a group in it. */
  readonly pipeline: Pick<Pipeline, "read">;
  readonly files: EseChartFiles;
}

export type ChartTjaReader = (songNo: string) => Promise<Result<string, ChartFileFailure>>;

/** A song's ESE chart file as text, for the page to draw: read each time asked, never kept. */
export function createChartTjaReader(options: ChartTjaReaderOptions): ChartTjaReader {
  const { pipeline, files } = options;
  const inFlight = new Map<string, Promise<Result<string, ChartFileFailure>>>();

  const read = async (songNo: string): Promise<Result<string, ChartFileFailure>> =>
    files.configured
      ? pipeline.read(CHART_TJA, (transport) => files.text(transport, songNo))
      : err({ code: "notConfigured" });

  return (songNo) => {
    const onItsWay = inFlight.get(songNo);
    if (onItsWay !== undefined) {
      return onItsWay;
    }
    const reading = read(songNo).finally(() => inFlight.delete(songNo));
    inFlight.set(songNo, reading);
    return reading;
  };
}
