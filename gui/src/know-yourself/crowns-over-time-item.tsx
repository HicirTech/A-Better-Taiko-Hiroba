import { CROWN_ORDER, type CrownState, crownsOverTime, type ScoreChange } from "@abth/core";
import { Checkbox, FormControlLabel, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { ShareLegend } from "../profile/share-block";
import { localDayOf } from "../shared/local-day";
import { FoldCard } from "../ui/fold-card";
import { StatusNote } from "../ui/status-note";
import { AreaChart } from "../ui/time-chart";
import type { KnownChart } from "./known-charts";
import type { PageParts } from "./page-parts";
import { clearSegments } from "./segments";

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
  const { i18n, lane, toast } = parts;
  const { t, number, date } = i18n;
  const [showNever, setShowNever] = useState(false);
  const points = useMemo(() => crownsOverTime(charts, changes, localDayOf), [charts, changes]);
  const first = points[0];
  const last = points.at(-1);
  const segments = clearSegments(i18n);
  const shown = STACKED.filter((crown) => showNever || crown !== "none");
  const bandOf = (crown: CrownState) => segments.find((segment) => segment.id === crown);
  return (
    <FoldCard
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
      details={() =>
        points.length < 2 ? (
          <StatusNote id="know-crowns-over-time-one-read">{t("chart.oneRead")}</StatusNote>
        ) : (
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
              bands={shown.map((crown) => ({ id: crown, colour: bandOf(crown)?.colour ?? "" }))}
              counts={points.map(({ value }) => shown.map((crown) => value[crown]))}
              format={number}
              dateOf={date}
              legend={(place, tops) => {
                const point = points[place];
                return point === undefined ? null : (
                  <ShareLegend
                    shows="count"
                    tops={tops}
                    items={shown.flatMap((crown) => {
                      const segment = bandOf(crown);
                      return segment === undefined
                        ? []
                        : [
                            {
                              ...segment,
                              id: `know-crowns-over-time-${crown}`,
                              count: point.value[crown],
                            },
                          ];
                    })}
                    lane={lane}
                    toast={toast}
                    i18n={i18n}
                  />
                );
              }}
            />
          </>
        )
      }
    />
  );
}
