import { ranksOverTime, type ScoreChange } from "@abth/core";
import { useMemo } from "react";
import { ShareLegend } from "../profile/share-block";
import { localDayOf } from "../shared/local-day";
import { FoldCard } from "../ui/fold-card";
import { StatusNote } from "../ui/status-note";
import { AreaChart } from "../ui/time-chart";
import type { KnownChart } from "./known-charts";
import { middleRank, RANK_SEGMENTS, type RankSegment } from "./ladder";
import type { PageParts } from "./page-parts";
import { rankSegments } from "./segments";

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
  const { i18n, lane, toast } = parts;
  const { t, date, locale } = i18n;
  const points = useMemo(() => ranksOverTime(charts, changes, localDayOf), [charts, changes]);
  const segments = rankSegments(i18n);
  const segmentOf = (rank: RankSegment) => segments[RANK_SEGMENTS.indexOf(rank)];
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const first = points[0];
  const last = points.at(-1);
  const middle = middleRank(charts);
  return (
    <FoldCard
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
      details={() =>
        points.length < 2 ? (
          <StatusNote id="know-ranks-over-time-one-read">{t("chart.oneRead")}</StatusNote>
        ) : (
          <AreaChart
            id="know-ranks-over-time-area"
            label={t("know.ranksOverTime")}
            times={points.map(({ at }) => Date.parse(at))}
            bands={STACKED.map((rank) => ({
              id: String(rank),
              colour: segmentOf(rank)?.colour ?? "",
            }))}
            counts={points.map(({ value }) => {
              const total = totalOf(value);
              return STACKED.map((rank) => (total === 0 ? 0 : (100 * value[rank]) / total));
            })}
            format={(value) => percent.format(value / 100)}
            dateOf={date}
            legend={(place, tops) => {
              const point = points[place];
              return point === undefined ? null : (
                <ShareLegend
                  tops={tops}
                  items={STACKED.flatMap((rank) => {
                    const segment = segmentOf(rank);
                    return segment === undefined
                      ? []
                      : [
                          {
                            ...segment,
                            id: `know-ranks-over-time-${rank}`,
                            count: point.value[rank],
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
        )
      }
    />
  );
}

function isRank(rank: RankSegment | null): rank is Exclude<RankSegment, "none"> {
  return rank !== null && rank !== "none";
}
