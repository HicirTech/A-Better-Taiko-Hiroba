import { ranksOverTime, type ScoreChange } from "@abth/core";
import { useMemo } from "react";
import { localDayOf } from "../shared/local-day";
import { AreaChart } from "../ui/time-chart";
import type { KnownChart } from "./known-charts";
import { middleRank, RANK_SEGMENTS, type RankSegment } from "./ladder";
import { OverTimeCard } from "./over-time-card";
import type { PageParts } from "./page-parts";
import { rankSegments } from "./segments";
import { type Stack, stackedBands, stackedLegend } from "./stacked-legend";

/** From the best rank up, as the crowns over time stack from the best crown. */
const STACKED: readonly RankSegment[] = [...RANK_SEGMENTS].reverse();

type RankCounts = Readonly<Record<RankSegment, number>>;

const totalOf = (counts: RankCounts) => RANK_SEGMENTS.reduce((sum, rank) => sum + counts[rank], 0);

/** The share of the tried charts at `rank` or better, from 0 to 1. */
function shareFrom(counts: RankCounts, rank: RankSegment): number {
  const total = totalOf(counts);
  const better = RANK_SEGMENTS.slice(RANK_SEGMENTS.indexOf(rank));
  return total === 0 ? 0 : better.reduce((sum, one) => sum + counts[one], 0) / total;
}

/** Each score rank's share of the tried charts over time. */
export function RanksOverTimeItem({
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
  const { t, date, locale } = i18n;
  const points = useMemo(() => ranksOverTime(charts, changes, localDayOf), [charts, changes]);
  const segments = rankSegments(i18n);
  const stack: Stack<RankSegment> = {
    id: "know-ranks-over-time",
    layers: STACKED,
    segmentOf: (rank) => segments[RANK_SEGMENTS.indexOf(rank)],
  };
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const first = points[0];
  const last = points.at(-1);
  const middle = middleRank(charts);
  return (
    <OverTimeCard
      id="know-ranks-over-time"
      opened={opened}
      title={t("know.ranksOverTime")}
      summary={
        first === undefined || last === undefined || points.length < 2 || !isRank(middle)
          ? t("know.ranksNoChange")
          : t("know.ranksSince", {
              rank: t(`scoreRank.${middle}`),
              from: percent.format(shareFrom(first.value, middle)),
              to: percent.format(shareFrom(last.value, middle)),
              date: date(first.at),
            })
      }
      readings={points.length}
      i18n={i18n}
      chart={() => (
        <AreaChart
          id="know-ranks-over-time-area"
          label={t("know.ranksOverTime")}
          times={points.map(({ at }) => Date.parse(at))}
          bands={stackedBands(stack)}
          counts={points.map(({ value }) => {
            const total = totalOf(value);
            return STACKED.map((rank) => (total === 0 ? 0 : (100 * value[rank]) / total));
          })}
          format={(value) => percent.format(value / 100)}
          dateOf={date}
          legend={stackedLegend(stack, points, "percent", parts)}
        />
      )}
    />
  );
}

function isRank(rank: RankSegment | null): rank is Exclude<RankSegment, "none"> {
  return rank !== null && rank !== "none";
}
