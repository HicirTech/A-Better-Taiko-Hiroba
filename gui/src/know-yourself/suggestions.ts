import {
  accuracyToRate,
  COUNTED,
  chartKey,
  measuredChart,
  type PlayerRating,
  type RatingData,
  sameChartKey,
} from "@abth/core";

import { SET_SONG_LIMIT } from "../shared/sets/favorite-sets";
import { upperMedian } from "./gaps";
import { BPM_STEP, HITS_PER_SECOND_STEP, oneTempo } from "./groups";
import { isCleared, isListed, type KnownChart } from "./known-charts";

/** The most charts a kind suggests: as many as a set holds, so one kind fills a set. */
export const SUGGESTED = SET_SONG_LIMIT;

/** The player as the rating's charts that count measure them. */
export interface RatedLevel {
  /** The middle of their constants. */
  readonly level: number;
  /** The middle of their accuracies, from 0 to 1. */
  readonly usual: number;
  /** What the last of them rates, as a chart must to count; none while fewer are rated. */
  readonly floor: number | null;
  /** Their keys, a chart under two song numbers by one. */
  readonly counting: ReadonlySet<string>;
}

/** A chart not cleared yet above the player's level, with its constant. */
export interface Harder {
  readonly chart: KnownChart;
  readonly constant: number;
}

/** A cleared chart that would count: its accuracy, and the one from which it counts. */
export interface Comfort {
  readonly chart: KnownChart;
  readonly constant: number;
  readonly accuracy: number;
  readonly needed: number;
}

/** The tempo and hits per second half the player's plays lie on either side of. */
export interface Favourites {
  readonly bpm: number;
  readonly hitsPerSecond: number;
}

/** What a kind offers: its charts, or why it has none to offer. */
export type HarderPick =
  | { readonly kind: "picked"; readonly level: number; readonly charts: readonly Harder[] }
  | { readonly kind: "notRated" | "noneRated" };
export type ComfortPick =
  | { readonly kind: "picked"; readonly usual: number; readonly charts: readonly Comfort[] }
  | { readonly kind: "notRated" | "noneRated" | "fewRated" };
export type JoyPick =
  | {
      readonly kind: "picked";
      readonly favourites: Favourites;
      readonly charts: readonly KnownChart[];
    }
  | { readonly kind: "noPlays" };

const bySong = (left: KnownChart, right: KnownChart) =>
  Number(left.songNo) - Number(right.songNo) || left.level - right.level;

const playedFirst = (left: KnownChart, right: KnownChart) =>
  Number(right.crown === "played") - Number(left.crown === "played");

/** The picks in their order, a chart the ratings hold under two song numbers once. */
function oncePerChart<T extends { readonly chart: KnownChart }>(picks: readonly T[]): T[] {
  const seen = new Set<string>();
  return picks.filter(({ chart }) => {
    const key = sameChartKey(chart);
    const first = !seen.has(key);
    seen.add(key);
    return first;
  });
}

/** The player's level, usual accuracy and floor from the charts that count; none with none. */
export function ratedLevelOf({ charts }: PlayerRating): RatedLevel | null {
  const counting = charts.slice(0, COUNTED);
  const level = upperMedian(counting.map(({ constant }) => constant));
  const usual = upperMedian(counting.map(({ accuracy }) => accuracy));
  return level === null || usual === null
    ? null
    : {
        level,
        usual,
        floor: counting[COUNTED - 1]?.figures.rating ?? null,
        counting: new Set(counting.map(sameChartKey)),
      };
}

/** Charts not cleared above the level, the nearest first, a played one before one never played. */
export function harderCharts(
  charts: readonly KnownChart[],
  data: RatingData,
  { level }: RatedLevel,
): Harder[] {
  const cleared = new Set(charts.filter(isCleared).map(sameChartKey));
  const above = charts.flatMap((chart): Harder[] => {
    const measured = cleared.has(sameChartKey(chart)) ? null : measuredChart(data, chart);
    return measured === null || measured.constant <= level
      ? []
      : [{ chart, constant: measured.constant }];
  });
  above.sort(
    (left, right) =>
      left.constant - right.constant ||
      playedFirst(left.chart, right.chart) ||
      bySong(left.chart, right.chart),
  );
  return oncePerChart(above).slice(0, SUGGESTED);
}

/** Cleared charts within the level that would count at the usual accuracy, smallest step first. */
export function comfortCharts(
  charts: readonly KnownChart[],
  data: RatingData,
  rated: PlayerRating,
  { level, usual, counting }: RatedLevel,
  floor: number,
): Comfort[] {
  const accuracyOf = new Map(rated.charts.map((one) => [chartKey(one), one.accuracy]));
  const reachable = charts.flatMap((chart): Comfort[] => {
    const accuracy = accuracyOf.get(chartKey(chart));
    if (!isCleared(chart) || accuracy === undefined || counting.has(sameChartKey(chart))) {
      return [];
    }

    const measured = measuredChart(data, chart);
    const needed =
      measured === null || measured.constant > level ? null : accuracyToRate(measured, floor);
    return measured === null || needed === null || needed > usual || needed <= accuracy
      ? []
      : [{ chart, constant: measured.constant, accuracy, needed }];
  });
  reachable.sort(
    (left, right) =>
      left.needed - left.accuracy - (right.needed - right.accuracy) ||
      right.constant - left.constant ||
      bySong(left.chart, right.chart),
  );
  return oncePerChart(reachable).slice(0, SUGGESTED);
}

/** The value more than half the plays lie at or below: the play-weighted upper median. */
function playedMiddle(values: readonly (readonly [value: number, plays: number])[]): number | null {
  const played = values.filter(([, plays]) => plays > 0).sort(([left], [right]) => left - right);
  const half = played.reduce((sum, [, plays]) => sum + plays, 0) / 2;
  let reached = 0;
  for (const [value, plays] of played) {
    reached += plays;
    if (reached > half) {
      return value;
    }
  }
  return null;
}

/** The middle of the plays' tempos, songs of one tempo alone, and of their hits per second. */
export function favouritesOf(
  charts: readonly KnownChart[],
  playsOf: (chart: KnownChart) => number,
): Favourites | null {
  const bpm = playedMiddle(
    charts.flatMap((chart) => {
      const tempo = oneTempo(chart.bpm);
      return tempo === null ? [] : [[tempo, playsOf(chart)] as const];
    }),
  );
  const hitsPerSecond = playedMiddle(
    charts.flatMap((chart) =>
      chart.hitsPerSecond === null ? [] : [[chart.hitsPerSecond, playsOf(chart)] as const],
    ),
  );
  return bpm === null || hitsPerSecond === null ? null : { bpm, hitsPerSecond };
}

/** Which charts joy may offer: those the other kinds do not show, never-played ones if asked. */
export interface JoyChoice {
  readonly withNever: boolean;
  readonly shown: ReadonlySet<string>;
}

/** Charts within a band of both favourites, the least played first, then the nearest. */
export function joyCharts(
  charts: readonly KnownChart[],
  playsOf: (chart: KnownChart) => number,
  favourites: Favourites,
  { withNever, shown }: JoyChoice,
): KnownChart[] {
  const near = charts.flatMap((chart) => {
    const tempo = oneTempo(chart.bpm);
    const { hitsPerSecond } = chart;
    if (
      tempo === null ||
      hitsPerSecond === null ||
      !isListed(chart) ||
      shown.has(chartKey(chart)) ||
      (!withNever && chart.crown === "none")
    ) {
      return [];
    }

    const tempoOff = Math.abs(tempo - favourites.bpm) / BPM_STEP;
    const densityOff = Math.abs(hitsPerSecond - favourites.hitsPerSecond) / HITS_PER_SECOND_STEP;
    return tempoOff > 1 || densityOff > 1
      ? []
      : [{ chart, plays: playsOf(chart), off: tempoOff + densityOff }];
  });
  near.sort(
    (left, right) =>
      left.plays - right.plays || left.off - right.off || bySong(left.chart, right.chart),
  );
  return oncePerChart(near)
    .slice(0, SUGGESTED)
    .map(({ chart }) => chart);
}

/** What the rating's two kinds offer at the page's difficulty. */
export function ratedPicksOf(
  charts: readonly KnownChart[],
  data: RatingData,
  rated: PlayerRating,
): { readonly harder: HarderPick; readonly comfort: ComfortPick } {
  if (!charts.some((chart) => measuredChart(data, chart) !== null)) {
    return { harder: { kind: "notRated" }, comfort: { kind: "notRated" } };
  }

  const level = ratedLevelOf(rated);
  if (level === null) {
    return { harder: { kind: "noneRated" }, comfort: { kind: "noneRated" } };
  }

  const listed = charts.filter(isListed);
  return {
    harder: { kind: "picked", level: level.level, charts: harderCharts(listed, data, level) },
    comfort:
      level.floor === null
        ? { kind: "fewRated" }
        : {
            kind: "picked",
            usual: level.usual,
            charts: comfortCharts(listed, data, rated, level, level.floor),
          },
  };
}

/** The keys of the charts the rating's kinds show, which joy leaves out. */
export function shownBy({
  harder,
  comfort,
}: {
  readonly harder: HarderPick;
  readonly comfort: ComfortPick;
}): ReadonlySet<string> {
  const shown = [
    ...(harder.kind === "picked" ? harder.charts : []),
    ...(comfort.kind === "picked" ? comfort.charts : []),
  ];
  return new Set(shown.map(({ chart }) => chartKey(chart)));
}

/** What joy offers at the page's difficulty. */
export function joyPickOf(
  charts: readonly KnownChart[],
  playsOf: (chart: KnownChart) => number,
  choice: JoyChoice,
): JoyPick {
  const favourites = favouritesOf(charts, playsOf);
  return favourites === null
    ? { kind: "noPlays" }
    : { kind: "picked", favourites, charts: joyCharts(charts, playsOf, favourites, choice) };
}
