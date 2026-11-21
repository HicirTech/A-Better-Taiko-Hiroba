import type { RatingSystem } from "@abth/core";
import type { Translator } from "@abth/i18n";

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
