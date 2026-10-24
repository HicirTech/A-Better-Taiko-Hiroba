import { keepSetting, keptSetting, pageStorage } from "../kept-settings";

/** Where a song's details take its chart pictures: drawn from TJA, or taiko.wiki's. */
export const CHART_SOURCES = ["tja", "wiki"] as const;
export type ChartSource = (typeof CHART_SOURCES)[number];
export const DEFAULT_CHART_SOURCE: ChartSource = "tja";

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
