import type { RatingSystem } from "@abth/core";

import { keepSetting, keptSetting, pageStorage } from "../shared/kept-settings";
import type { RatingDataRead } from "./read-rating-data";

const VERSION = 1;

const keyOf = (system: RatingSystem) => `abth.ratingData.${system}`;
const isText = (value: unknown): value is string => typeof value === "string";

/** A rating system's data as last read on this device, or null when none was. */
export function loadRatingData(
  system: RatingSystem,
  storage: Storage | undefined = pageStorage(),
): RatingDataRead | null {
  const kept = keptSetting(keyOf(system), isText, storage);
  if (kept === null) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(kept);
    return isKept(value) ? { text: value.text, sentAt: value.sentAt } : null;
  } catch {
    return null;
  }
}

export function keepRatingData(
  system: RatingSystem,
  read: RatingDataRead,
  storage: Storage | undefined = pageStorage(),
): void {
  keepSetting(keyOf(system), JSON.stringify({ v: VERSION, ...read }), storage);
}

function isKept(value: unknown): value is { readonly text: string; readonly sentAt: number } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { v, text, sentAt } = value as Record<string, unknown>;
  return v === VERSION && typeof text === "string" && typeof sentAt === "number";
}
