import type { RatingSystem } from "@abth/core";
import type { MessageKey } from "@abth/i18n";

/** The ratings in the order their switches show them. */
export const RATING_SYSTEMS: readonly RatingSystem[] = ["ourtaikoV1", "ourtaikoV2"];

/** Each rating's full name, as Settings and a shared picture write it. */
export const RATING_SYSTEM_NAME: Readonly<Record<RatingSystem, MessageKey>> = {
  ourtaikoV1: "rating.system.ourtaikoV1",
  ourtaikoV2: "rating.system.ourtaikoV2",
};
