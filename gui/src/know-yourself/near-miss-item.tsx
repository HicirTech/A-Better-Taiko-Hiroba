import { useMemo } from "react";

import { FoldCard } from "../ui/fold-card";
import type { KnownChart } from "./known-charts";
import { nearMisses } from "./near-misses";
import type { PageParts } from "./page-parts";

/** The crown a near miss lacks: a full combo, by a few Bad, or a donderful, by a few OK. */
export type NearCrown = "fullCombo" | "donderful";

const WORDING = {
  fullCombo: {
    id: "know-full-combo",
    title: "know.almost.fullCombo",
    count: "know.almost.fullCombo.count",
    none: "know.almost.fullCombo.none",
    hit: "history.bad",
  },
  donderful: {
    id: "know-donderful",
    title: "know.almost.donderful",
    count: "know.almost.donderful.count",
    none: "know.almost.donderful.none",
    hit: "history.ok",
  },
} as const;

/** The charts a few hits from their next crown, the fewest first, each opening its details. */
export function NearMissItem({
  crown,
  charts,
  parts,
}: {
  readonly crown: NearCrown;
  readonly charts: readonly KnownChart[];
  readonly parts: PageParts;
}) {
  const { i18n, chartList } = parts;
  const { t, number } = i18n;
  const misses = useMemo(() => nearMisses(charts)[crown], [charts, crown]);
  const wording = WORDING[crown];
  const left = new Map(misses.map((miss) => [miss.chart, miss.left]));
  return (
    <FoldCard
      id={wording.id}
      title={t(wording.title)}
      summary={
        misses.length === 0 ? t(wording.none) : t(wording.count, { count: number(misses.length) })
      }
      details={
        misses.length === 0
          ? null
          : () =>
              chartList(
                `${wording.id}-list`,
                misses.map((miss) => miss.chart),
                (chart) => `${t(wording.hit)} ${number(left.get(chart) ?? 0)}`,
              )
      }
    />
  );
}
