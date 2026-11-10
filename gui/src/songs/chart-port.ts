import type { HirobaSessionPort } from "../shared/session-port";

/** The port's calls for a chart's pictures: ABTH CDN's, drawn ones kept, and taiko.wiki's. */
export type ChartPicturePort = Pick<
  HirobaSessionPort,
  "readChartPicture" | "readCdnChart" | "readDrawnChart" | "keepDrawnChart"
>;

/** The port's calls a song's details read its charts with: pictures, note density and TJA. */
export type ChartPort = ChartPicturePort &
  Pick<HirobaSessionPort, "readChartDensity" | "readChartTja">;
