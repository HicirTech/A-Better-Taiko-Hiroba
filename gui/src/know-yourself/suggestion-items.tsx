import type { RatingData, RatingSystem } from "@abth/core";
import type { PlainMessageKey, Translator } from "@abth/i18n";
import { Checkbox, FormControlLabel, Typography } from "@mui/material";
import { useMemo, useState } from "react";

import type { RatingFormats } from "../shared/rating-data/rating-formats";
import { NONE_RATED, RATING_SYSTEM_NAME } from "../shared/rating-data/rating-systems";
import { bpmText } from "../songs/song-facts";
import { FoldCard } from "../ui/fold-card";
import { StatusNote } from "../ui/status-note";
import { gapKindOf } from "./gaps";
import type { KnownChart } from "./known-charts";
import type { PageParts } from "./page-parts";
import { type ComfortPick, type HarderPick, joyPickOf } from "./suggestions";

/** The rating the suggestions follow, Settings' default: its data, and where its read stands. */
export interface SuggestedBy {
  readonly system: RatingSystem;
  readonly data: RatingData | null;
  readonly reading: boolean;
  readonly failure: string | null;
}

/** What a rating's card says on a difficulty the rating does not rate. */
const UNRATED = {
  ourtaikoV1: "know.suggest.unrated",
  ourtaikoV2: "know.suggest.unratedV2",
} as const satisfies Record<RatingSystem, PlainMessageKey>;

/** Why a rating's card offers no chart: its data is away, or the rating has none to give. */
function missing(
  by: SuggestedBy,
  pick: Exclude<HarderPick | ComfortPick, { readonly kind: "picked" }> | null,
  { t }: Translator,
): string {
  switch (pick?.kind) {
    case undefined:
      return t(by.failure === null ? "rating.readingData" : "rating.dataFailed");
    case "notRated":
      return t(UNRATED[by.system]);
    case "noneRated":
      return t(NONE_RATED[by.system]);
    case "fewRated":
      return t("know.suggest.comfort.fewRated");
  }
}

const percentOf = (value: number, formats: RatingFormats, { t }: Translator) =>
  t("rating.accuracy", { value: formats.figure.format(value * 100) });

/** The charts not cleared just above the player's level, the nearest first. */
export function HarderItem({
  by,
  pick,
  formats,
  parts,
  opened = false,
}: {
  readonly by: SuggestedBy;
  /** None while the rating's data is away. */
  readonly pick: HarderPick | null;
  readonly formats: RatingFormats;
  readonly parts: PageParts;
  /** Held open, as a story of it does. */
  readonly opened?: boolean;
}) {
  const { i18n, chartList } = parts;
  const { t } = i18n;
  const picked = pick?.kind === "picked" ? pick.charts : [];
  const constantOf = new Map(picked.map(({ chart, constant }) => [chart, constant]));
  return (
    <FoldCard
      id="know-harder"
      opened={opened}
      title={t("know.suggest.harder")}
      summary={
        pick === null || pick.kind !== "picked"
          ? missing(by, pick, i18n)
          : picked.length === 0
            ? t("know.suggest.harder.none")
            : t("know.suggest.harder.summary", {
                level: formats.constant.format(pick.level),
                rating: t(RATING_SYSTEM_NAME[by.system]),
              })
      }
      details={
        picked.length === 0
          ? null
          : () =>
              chartList(
                "know-harder-list",
                picked.map(({ chart }) => chart),
                (chart) =>
                  [
                    t("rating.constant", {
                      value: formats.constant.format(constantOf.get(chart) ?? 0),
                    }),
                    t(gapKindOf(chart) === "never" ? "know.never" : "know.tried"),
                  ].join(" · "),
              )
      }
    />
  );
}

/** The cleared charts within the player's level that would count, the smallest step first. */
export function ComfortItem({
  by,
  pick,
  formats,
  parts,
  opened = false,
}: {
  readonly by: SuggestedBy;
  /** None while the rating's data is away. */
  readonly pick: ComfortPick | null;
  readonly formats: RatingFormats;
  readonly parts: PageParts;
  /** Held open, as a story of it does. */
  readonly opened?: boolean;
}) {
  const { i18n, chartList } = parts;
  const { t } = i18n;
  const picked = pick?.kind === "picked" ? pick.charts : [];
  const stepOf = new Map(picked.map((one) => [one.chart, one]));
  return (
    <FoldCard
      id="know-comfort"
      opened={opened}
      title={t("know.suggest.comfort")}
      summary={
        pick === null || pick.kind !== "picked"
          ? missing(by, pick, i18n)
          : picked.length === 0
            ? t("know.suggest.comfort.none")
            : t("know.suggest.comfort.summary", {
                accuracy: percentOf(pick.usual, formats, i18n),
              })
      }
      details={
        picked.length === 0
          ? null
          : () =>
              chartList(
                "know-comfort-list",
                picked.map(({ chart }) => chart),
                (chart) => {
                  const step = stepOf.get(chart);
                  return step === undefined
                    ? ""
                    : t("know.suggest.toCount", {
                        now: percentOf(step.accuracy, formats, i18n),
                        needed: percentOf(step.needed, formats, i18n),
                      });
                },
              )
      }
    />
  );
}

/** The charts at the tempo and density the player plays most; those never played by choice. */
export function JoyItem({
  charts,
  playsOf,
  shown,
  formats,
  parts,
  opened = false,
}: {
  readonly charts: readonly KnownChart[];
  readonly playsOf: (chart: KnownChart) => number;
  /** The charts the other cards show, which this one leaves out. */
  readonly shown: ReadonlySet<string>;
  readonly formats: RatingFormats;
  readonly parts: PageParts;
  /** Held open, as a story of it does. */
  readonly opened?: boolean;
}) {
  const { i18n, chartList } = parts;
  const { t, number } = i18n;
  const [withNever, setWithNever] = useState(true);
  const pick = useMemo(
    () => joyPickOf(charts, playsOf, { withNever, shown }),
    [charts, playsOf, withNever, shown],
  );
  const note = (chart: KnownChart) =>
    [
      chart.bpm === null ? null : t("song.bpm", { bpm: bpmText(chart.bpm) }),
      chart.hitsPerSecond === null
        ? null
        : t("know.suggest.hitsPerSecond", { value: formats.figure.format(chart.hitsPerSecond) }),
    ]
      .filter((part) => part !== null)
      .join(" · ");
  return (
    <FoldCard
      id="know-joy"
      opened={opened}
      title={t("know.suggest.joy")}
      summary={
        pick.kind === "picked"
          ? t("know.suggest.joy.summary", {
              bpm: number(pick.favourites.bpm),
              hits: formats.figure.format(pick.favourites.hitsPerSecond),
            })
          : t("know.suggest.joy.noPlays")
      }
      details={
        pick.kind === "picked"
          ? () => (
              <>
                <FormControlLabel
                  control={
                    <Checkbox
                      id="know-joy-never"
                      size="small"
                      checked={withNever}
                      onChange={(event) => setWithNever(event.target.checked)}
                    />
                  }
                  label={<Typography variant="body2">{t("know.showNever")}</Typography>}
                />
                {pick.charts.length === 0 ? (
                  <StatusNote id="know-joy-none">{t("know.suggest.joy.none")}</StatusNote>
                ) : (
                  chartList("know-joy-list", pick.charts, note)
                )}
              </>
            )
          : null
      }
    />
  );
}
