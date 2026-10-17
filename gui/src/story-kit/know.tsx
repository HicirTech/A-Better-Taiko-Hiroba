import type { Translator } from "@abth/i18n";
import { type ReactNode, useState } from "react";
import { action } from "storybook/actions";

import { ChartList } from "../know-yourself/chart-list";
import { anchorOf, gapKindOf, gapsOf, nearestFirst } from "../know-yourself/gaps";
import { type KnownChart, knownCharts, shownAt } from "../know-yourself/known-charts";
import type { PageParts } from "../know-yourself/page-parts";
import type { PictureLane } from "../pictures/picture-lane";
import type { SystemToast } from "../platform";
import { STORY_LISTED } from "./scores";
import { lookOf, storyCatalogue } from "./songs";

/** The made-up player's Extreme and inner charts, as Know yourself joins them to the song list. */
export const STORY_KNOWN: readonly KnownChart[] = shownAt(
  knownCharts(STORY_LISTED, storyCatalogue().songs),
  "oni",
);

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
