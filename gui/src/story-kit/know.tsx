import { chartKey, ratePlayer } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { type ReactNode, useState } from "react";
import { action } from "storybook/actions";

import { ChartList } from "../know-yourself/chart-list";
import { anchorOf, gapKindOf, gapsOf, nearestFirst } from "../know-yourself/gaps";
import { isCleared, type KnownChart, knownCharts, shownAt } from "../know-yourself/known-charts";
import type { PageParts } from "../know-yourself/page-parts";
import type { SuggestedBy } from "../know-yourself/suggestion-items";
import { type ComfortPick, ratedPicksOf } from "../know-yourself/suggestions";
import type { PictureLane } from "../pictures/picture-lane";
import type { SystemToast } from "../platform";
import { ratingDataOf } from "../shared/rating-data/read-rating-data";
import { STORY_LISTED, STORY_RATING_DATA, STORY_SCORES } from "./scores";
import { lookOf, storyCatalogue } from "./songs";

/** The made-up player's Extreme and inner charts, as Know yourself joins them to the song list. */
export const STORY_KNOWN: readonly KnownChart[] = shownAt(
  knownCharts(STORY_LISTED, storyCatalogue().songs),
  "oni",
);

const STORY_V1 = ratingDataOf("ourtaikoV1", STORY_RATING_DATA);

/** The made-up player's rating by V1, as Know yourself's suggestions follow it. */
export const STORY_SUGGESTED_BY: SuggestedBy = {
  system: "ourtaikoV1",
  data: STORY_V1,
  reading: false,
  failure: null,
};

/** What V1's two kinds offer the made-up player at Extreme; none without its data. */
export const STORY_PICKS =
  STORY_V1 === null
    ? null
    : ratedPicksOf(STORY_KNOWN, STORY_V1, ratePlayer(STORY_SCORES.scores, STORY_V1));

/** Cleared charts a step from counting, made up for the card: the made-up player has none. */
export const STORY_COMFORT: ComfortPick = {
  kind: "picked",
  usual: 0.9524,
  charts: STORY_KNOWN.filter(isCleared)
    .slice(0, 6)
    .map((chart, at) => ({
      chart,
      constant: 9.5 - at / 10,
      accuracy: 0.948 - at / 100,
      needed: 0.95 + at / 1000,
    })),
};

const STORY_PLAYS = new Map(
  STORY_SCORES.scores.map((score) => [chartKey(score), score.record.stageCount ?? 0]),
);

/** How often the made-up player played a chart. */
export const storyPlaysOf = (chart: KnownChart): number => STORY_PLAYS.get(chartKey(chart)) ?? 0;

/** What Know yourself's cards draw with, one row open at a time, as the page gives it. */
export function KnowParts({
  i18n,
  lane,
  toast,
  children,
}: {
  readonly i18n: Translator;
  readonly lane: PictureLane;
  readonly toast: SystemToast | undefined;
  readonly children: (parts: PageParts) => ReactNode;
}) {
  const [opened, setOpened] = useState<string | null>(null);
  const anchor = anchorOf(STORY_KNOWN);
  const list = (
    id: string,
    charts: readonly KnownChart[],
    note: (chart: KnownChart) => string,
    narrows: boolean,
  ) => (
    <ChartList
      key={id}
      id={id}
      charts={charts}
      note={note}
      narrows={narrows}
      lookOf={(songNo) => lookOf(songNo, i18n.locale)}
      opener={() => action("open the chart's details")}
      lane={lane}
      i18n={i18n}
      onAdd={action("add to a set")}
    />
  );
  return children({
    i18n,
    lane,
    toast,
    openedIn: (part) =>
      opened?.startsWith(`${part}:`) === true ? opened.slice(part.length + 1) : null,
    toggleIn: (part) => (row) =>
      setOpened((now) => (now === `${part}:${row}` ? null : `${part}:${row}`)),
    gapList: (id, charts) => {
      const gaps = gapsOf(charts);
      return gaps.length === 0
        ? null
        : () =>
            list(
              id,
              nearestFirst(gaps, anchor),
              (chart) => i18n.t(gapKindOf(chart) === "never" ? "know.never" : "know.tried"),
              true,
            );
    },
    chartList: (id, charts, note) => list(id, charts, note, false),
  });
}
