import type { RatingSystem } from "@abth/core";

/** Where each rating system's data is published. */
export const RATING_DATA_URL: Readonly<Record<RatingSystem, string>> = {
  ourtaikoV1: "https://cdn.ourtaiko.org/api/fumendb_constants",
};
