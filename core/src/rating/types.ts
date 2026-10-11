import type { Chart, Score } from "../hiroba-models";

/** A rating system the app computes: its own data and its own formula, never mixed. */
export type RatingSystem = "ourtaikoV1";

/** What a rating takes from a played chart: a kept score, or a view of one. */
export type RatedScore = Pick<Score, "songNo" | "level" | "crown" | "record">;

/** What a system rates: the rating itself, then the skills it splits a player into. */
export type RatingFigure =
  | "rating"
  | "power"
  | "stamina"
  | "speed"
  | "accuracy"
  | "rhythm"
  | "complex";

/** A chart's figures; a skill the chart's data cannot give is absent. */
export type ChartFigures = Readonly<Partial<Record<RatingFigure, number>>> & {
  readonly rating: number;
};

/** One played chart as a system rates it. */
export interface ChartRating extends Chart {
  /** From 0 to 1. */
  readonly accuracy: number;
  readonly figures: ChartFigures;
}

/** One of a player's figures, taken from their best charts for it. */
export interface PlayerFigure {
  readonly figure: RatingFigure;
  readonly value: number;
  /** Raised toward the top of the scale, as a player near the top is. */
  readonly compensated: boolean;
}

export interface PlayerRating {
  readonly system: RatingSystem;
  /** In the system's order, the rating first. */
  readonly figures: readonly PlayerFigure[];
  /** Every chart the system rated, the highest rating first. */
  readonly charts: readonly ChartRating[];
}
