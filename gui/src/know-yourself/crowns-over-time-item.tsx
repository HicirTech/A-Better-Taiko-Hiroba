import { CROWN_ORDER, type CrownState, crownsOverTime, type ScoreChange } from "@abth/core";
import { Checkbox, FormControlLabel, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { localDayOf } from "../shared/local-day";
import { AreaChart } from "../ui/time-chart";
import type { KnownChart } from "./known-charts";
import { OverTimeCard } from "./over-time-card";
import type { PageParts } from "./page-parts";
import { clearSegments } from "./segments";
import { type Stack, stackedBands, stackedLegend } from "./stacked-legend";

/** From the best crown up, so what the player has earned stands still as never-played comes in. */
const STACKED: readonly CrownState[] = ["donderful", "gold", "silver", "played", "none"];

const atLeast = (counts: Readonly<Record<CrownState, number>>, crown: "silver" | "gold"): number =>
  STACKED.filter((one) => CROWN_ORDER[one] >= CROWN_ORDER[crown]).reduce(
    (sum, one) => sum + counts[one],
    0,
  );

/** How many charts held each crown over time; the charts never played only by choice. */
export function CrownsOverTimeItem({
  charts,
  changes,
  parts,
  opened = false,
}: {
  readonly charts: readonly KnownChart[];
  readonly changes: readonly ScoreChange[];
  readonly parts: PageParts;
  /** Held open, as a story of it does. */
  readonly opened?: boolean;
}) {
  const { i18n } = parts;
  const { t, number, date } = i18n;
  const [showNever, setShowNever] = useState(false);
  const points = useMemo(() => crownsOverTime(charts, changes, localDayOf), [charts, changes]);
  const first = points[0];
  const last = points.at(-1);
  const segments = clearSegments(i18n);
  const shown = STACKED.filter((crown) => showNever || crown !== "none");
  const stack: Stack<CrownState> = {
    id: "know-crowns-over-time",
    layers: shown,
    segmentOf: (crown) => segments.find((segment) => segment.id === crown),
  };
  return (
    <OverTimeCard
      id="know-crowns-over-time"
      opened={opened}
      title={t("know.crownsOverTime")}
      summary={
        first === undefined || last === undefined || points.length < 2
          ? t("know.crownsNoChange")
          : t("know.crownsSince", {
              clears: number(atLeast(last.value, "silver") - atLeast(first.value, "silver")),
              combos: number(atLeast(last.value, "gold") - atLeast(first.value, "gold")),
              date: date(first.at),
            })
      }
      readings={points.length}
      i18n={i18n}
      chart={() => (
        <>
          <FormControlLabel
            control={
              <Checkbox
                id="know-crowns-over-time-never"
                size="small"
                checked={showNever}
                onChange={(event) => setShowNever(event.target.checked)}
              />
            }
            label={<Typography variant="body2">{t("know.showNever")}</Typography>}
          />
          <AreaChart
            id="know-crowns-over-time-area"
            label={t("know.crownsOverTime")}
            times={points.map(({ at }) => Date.parse(at))}
            bands={stackedBands(stack)}
            counts={points.map(({ value }) => shown.map((crown) => value[crown]))}
            format={number}
            dateOf={date}
            legend={stackedLegend(stack, points, "count", parts)}
          />
        </>
      )}
    />
  );
}
