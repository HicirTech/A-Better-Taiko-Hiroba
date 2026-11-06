import { type Chart, chartKey, playsOverTime, type ScoreChange } from "@abth/core";
import { Typography } from "@mui/material";
import { useMemo } from "react";
import { localDayOf } from "../shared/local-day";
import type { ScoreView } from "../shared/session-port";
import { FoldCard } from "../ui/fold-card";
import { StatusNote } from "../ui/status-note";
import { LineChart } from "../ui/time-chart";
import type { PageParts } from "./page-parts";

/** The charts' plays added up over time, as reads of scores found them. */
export function PlaysItem({
  charts,
  scoreOf,
  changes,
  parts,
  opened = false,
}: {
  readonly charts: readonly Chart[];
  readonly scoreOf: ReadonlyMap<string, ScoreView>;
  readonly changes: readonly ScoreChange[];
  readonly parts: PageParts;
  /** Held open, as a story of it does. */
  readonly opened?: boolean;
}) {
  const { t, number, date } = parts.i18n;
  const counted = useMemo(
    () =>
      charts.map((chart) => ({
        ...chart,
        stageCount: scoreOf.get(chartKey(chart))?.record.stageCount ?? null,
      })),
    [charts, scoreOf],
  );
  const points = useMemo(() => playsOverTime(counted, changes, localDayOf), [counted, changes]);
  const total = counted.reduce((sum, { stageCount }) => sum + (stageCount ?? 0), 0);
  const first = points[0];
  return (
    <FoldCard
      id="know-plays"
      opened={opened}
      title={t("know.plays")}
      summary={
        first === undefined || points.length < 2
          ? t("know.playsSoFar", { count: number(total) })
          : t("know.playsSince", {
              count: number(total),
              more: number(total - first.value),
              date: date(first.at),
            })
      }
      details={() =>
        points.length < 2 ? (
          <StatusNote id="know-plays-one-read">{t("chart.oneRead")}</StatusNote>
        ) : (
          <LineChart
            id="know-plays-line"
            label={t("know.plays")}
            points={points.map(({ at, value }) => ({ at: Date.parse(at), value }))}
            format={number}
            dateOf={date}
            readout={(place) => <Typography>{number(points[place]?.value ?? 0)}</Typography>}
          />
        )
      }
    />
  );
}
