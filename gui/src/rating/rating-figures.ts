import type { PlayerRating, RatingFigure, RatingSystem } from "@abth/core";
import type { MessageKey, Translator } from "@abth/i18n";

import type { RadarFigure } from "./rating-radar";

/** The charts the rating counts, and as many after them that could join. */
export const COUNTED = 20;

const FIGURE_LABEL: Readonly<Record<RatingFigure, MessageKey>> = {
  rating: "rating.figure.rating",
  power: "rating.figure.power",
  stamina: "rating.figure.stamina",
  speed: "rating.figure.speed",
  burst: "rating.figure.burst",
  accuracy: "rating.figure.accuracy",
  rhythm: "rating.figure.rhythm",
  complex: "rating.figure.complex",
};

/** Each rating's short name, as its switch on Rating writes it. */
export const RATING_SYSTEM_SHORT: Readonly<Record<RatingSystem, MessageKey>> = {
  ourtaikoV1: "rating.systemShort.ourtaikoV1",
  ourtaikoV2: "rating.systemShort.ourtaikoV2",
};

/** What a rating says when no chart is rated yet: the difficulties it rates. */
export const NONE_RATED: Readonly<Record<RatingSystem, MessageKey>> = {
  ourtaikoV1: "rating.noneRated",
  ourtaikoV2: "rating.noneRatedV2",
};

// V1's constants go in steps of 0.1; V2's are measured, and OurTaiko writes them to two places.
const CONSTANT_PLACES: Readonly<Record<RatingSystem, number>> = { ourtaikoV1: 1, ourtaikoV2: 2 };

/** How the rating's figures are written: a figure to two places, a constant as its rating's are. */
export interface RatingFormats {
  readonly figure: Intl.NumberFormat;
  readonly constant: Intl.NumberFormat;
}

export const ratingFormats = (
  locale: Translator["locale"],
  system: RatingSystem,
): RatingFormats => {
  const places = CONSTANT_PLACES[system];
  return {
    figure: new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    constant: new Intl.NumberFormat(locale, {
      minimumFractionDigits: places,
      maximumFractionDigits: places,
    }),
  };
};

/** The player's rating, and their skills named for the radar. */
export function ratingAndSkills(
  rated: PlayerRating | null,
  t: Translator["t"],
): { readonly total: number | null; readonly skills: readonly RadarFigure[] } {
  const figures = rated?.figures ?? [];
  return {
    total: figures.find((figure) => figure.figure === "rating")?.value ?? null,
    skills: figures
      .filter((figure) => figure.figure !== "rating")
      .map((figure) => ({ name: t(FIGURE_LABEL[figure.figure]), value: figure.value })),
  };
}
