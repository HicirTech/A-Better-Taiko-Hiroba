import type { PlayerRating, RatingFigure, RatingSystem } from "@abth/core";
import type { PlainMessageKey, Translator } from "@abth/i18n";

import type { RadarFigure } from "./rating-radar";

const FIGURE_LABEL: Readonly<Record<RatingFigure, PlainMessageKey>> = {
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
export const RATING_SYSTEM_SHORT: Readonly<Record<RatingSystem, PlainMessageKey>> = {
  ourtaikoV1: "rating.systemShort.ourtaikoV1",
  ourtaikoV2: "rating.systemShort.ourtaikoV2",
};

/** The player's rating, and their skills named for the radar. */
export function ratingAndSkills(
  rated: Pick<PlayerRating, "figures"> | null,
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
