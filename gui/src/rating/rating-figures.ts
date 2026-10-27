import type { ChartRating, OurTaikoV1Data, PlayerRating, RatingFigure } from "@abth/core";
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

/** How the rating's figures are written: a figure to two places, a constant to one. */
export interface RatingFormats {
  readonly figure: Intl.NumberFormat;
  readonly constant: Intl.NumberFormat;
}

export const ratingFormats = (locale: Translator["locale"]): RatingFormats => ({
  figure: new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  constant: new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
});

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

/** A chart's constant in the system's data; null where the data lacks it. */
export const constantOf = (data: OurTaikoV1Data | null, chart: ChartRating): number | null =>
  data?.get(chart.songNo)?.get(chart.level)?.constant ?? null;
