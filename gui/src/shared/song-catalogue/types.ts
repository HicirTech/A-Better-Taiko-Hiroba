/** The most bytes a chart picture may have, fetched or drawn. */
export const CHART_PICTURE_MAX_BYTES = 4 * 1024 * 1024;

/** How to read a chart picture: only the one kept, the one kept or else a fetch, or a new fetch. */
export type ChartPictureRead = "kept" | "any" | "again";

/** Codes, not sentences. */
export interface SongCatalogueFailure {
  readonly code: "notConfigured" | "unreachable" | "timedOut" | "badAnswer" | "callFailed";
}

/** Codes, not sentences; `noChart` is a song ESE has no chart file for. */
export interface ChartFileFailure {
  readonly code: SongCatalogueFailure["code"] | "noChart";
}
