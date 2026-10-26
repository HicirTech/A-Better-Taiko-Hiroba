import { keepSetting, keptSetting, pageStorage } from "../kept-settings";

/** Where a song's details take chart pictures: ABTH CDN's, drawn here from TJA, or taiko.wiki's. */
export const CHART_SOURCES = ["cdn", "tja", "wiki"] as const;
export type ChartSource = (typeof CHART_SOURCES)[number];
export const DEFAULT_CHART_SOURCE: ChartSource = "cdn";

const KEY = "abth.chartSource";

const isChartSource = (value: unknown): value is ChartSource =>
  (CHART_SOURCES as readonly unknown[]).includes(value);

export function keptChartSource(storage: Storage | undefined = pageStorage()): ChartSource {
  return keptSetting(KEY, isChartSource, storage) ?? DEFAULT_CHART_SOURCE;
}

export function keepChartSource(
  source: ChartSource,
  storage: Storage | undefined = pageStorage(),
): void {
  keepSetting(KEY, source, storage);
}
