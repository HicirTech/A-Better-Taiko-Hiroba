import type { Level } from "../hiroba-models";

/** A branched chart's three paths, as TJA's `#N`, `#E` and `#M` name them. */
export type ChartBranch = "normal" | "advanced" | "master";

export const CHART_BRANCHES: readonly ChartBranch[] = ["normal", "advanced", "master"];

/** One path through a chart: its notes, counted in each second from its first note. */
export interface NoteDensity {
  /** Every don and ka, small and big; drumrolls and balloons are not notes. */
  readonly notes: number;
  /** From the first note to the last. */
  readonly seconds: number;
  /** Notes in each one-second slice, the first starting at the first note. */
  readonly perSecond: readonly number[];
}

/** A chart's note density: one line, or one per branch. */
export type ChartDensity =
  | { readonly branched: false; readonly line: NoteDensity }
  | { readonly branched: true; readonly lines: Readonly<Record<ChartBranch, NoteDensity>> };

/** The single-player charts a TJA holds, by level. */
export type SongDensity = ReadonlyMap<Level, ChartDensity>;
