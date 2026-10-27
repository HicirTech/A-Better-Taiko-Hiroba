import type { RatingSystem } from "@abth/core";

import { keepSetting, keptSetting, pageStorage } from "../kept-settings";
import { RATING_SYSTEMS } from "./rating-systems";

/** The rating Rating opens on, until Settings chooses another. */
export const DEFAULT_STARTING_RATING: RatingSystem = "ourtaikoV1";

const KEY = "abth.ratingSystem";

const isRatingSystem = (value: unknown): value is RatingSystem =>
  (RATING_SYSTEMS as readonly unknown[]).includes(value);

export function keptStartingRating(storage: Storage | undefined = pageStorage()): RatingSystem {
  return keptSetting(KEY, isRatingSystem, storage) ?? DEFAULT_STARTING_RATING;
}

export function keepStartingRating(
  system: RatingSystem,
  storage: Storage | undefined = pageStorage(),
): void {
  keepSetting(KEY, system, storage);
}
