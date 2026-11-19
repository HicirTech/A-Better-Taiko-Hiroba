import type { RatingSystem } from "@abth/core";
import type { PlainMessageKey } from "@abth/i18n";

/** The ratings in the order their switches show them. */
export const RATING_SYSTEMS: readonly RatingSystem[] = ["ourtaikoV1", "ourtaikoV2"];

/** Each rating's full name, as Settings and a shared picture write it. */
export const RATING_SYSTEM_NAME: Readonly<Record<RatingSystem, PlainMessageKey>> = {
  ourtaikoV1: "rating.system.ourtaikoV1",
  ourtaikoV2: "rating.system.ourtaikoV2",
};

/** What a rating says when no chart is rated yet: the difficulties it rates. */
export const NONE_RATED: Readonly<Record<RatingSystem, PlainMessageKey>> = {
  ourtaikoV1: "rating.noneRated",
  ourtaikoV2: "rating.noneRatedV2",
};
