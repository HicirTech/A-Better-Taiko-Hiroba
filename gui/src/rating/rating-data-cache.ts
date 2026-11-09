import type { RatingSystem } from "@abth/core";

import { keepJson, keptJson, pageStorage } from "../shared/kept-settings";
import type { RatingDataRead } from "../shared/rating-data/read-rating-data";

const VERSION = 1;

const keyOf = (system: RatingSystem) => `abth.ratingData.${system}`;

const ratingDataIn = ({ text, sentAt }: Record<string, unknown>): RatingDataRead | null =>
  typeof text === "string" && typeof sentAt === "number" ? { text, sentAt } : null;

/** A rating system's data as last read on this device, or null when none was. */
export function loadRatingData(
  system: RatingSystem,
  storage: Storage | undefined = pageStorage(),
): RatingDataRead | null {
  return keptJson(keyOf(system), VERSION, ratingDataIn, storage);
}

export function keepRatingData(
  system: RatingSystem,
  read: RatingDataRead,
  storage: Storage | undefined = pageStorage(),
): void {
  keepJson(keyOf(system), VERSION, read, storage);
}
