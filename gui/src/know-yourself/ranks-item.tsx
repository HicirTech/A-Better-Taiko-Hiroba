import { useMemo } from "react";

import { byStars, groupId } from "./groups";
import { KnowItem } from "./know-item";
import { isTried, type KnownChart } from "./known-charts";
import { middleRank, rankCounts } from "./ladder";
import type { PageParts } from "./page-parts";
import { rankSegments } from "./segments";
import { ShareRows } from "./share-rows";

/** Each star level's score ranks over the tried charts, and the rank half of them reach. */
export function RanksItem({
  charts,
  parts,
}: {
  readonly charts: readonly KnownChart[];
  readonly parts: PageParts;
}) {
  const { i18n, lane, toast } = parts;
  const { t } = i18n;
  const groups = useMemo(
    () => byStars(charts).filter((group) => group.charts.some(isTried)),
    [charts],
  );
  const middle = middleRank(charts);
  const summary =
    middle === null
      ? t("know.ranks.none")
      : middle === "none"
        ? t("know.ranks.middleNone")
        : t("know.ranks.middle", { rank: t(`scoreRank.${middle}`) });
  return (
    <KnowItem
      id="know-ranks"
      title={t("panel.ranks")}
      summary={summary}
      details={
        groups.length === 0
          ? null
          : () => (
              <ShareRows
                id="know-ranks-rows"
                segments={rankSegments(i18n)}
                rows={groups.map(({ key, charts: inGroup }) => ({
                  id: groupId(key),
                  label:
                    key.kind === "stars"
                      ? t("picker.level", { level: key.stars })
                      : t("know.unknown"),
                  counts: rankCounts(inGroup),
                  list: null,
                }))}
                legend={rankCounts(charts)}
                opened={null}
                onToggle={() => undefined}
                lane={lane}
                toast={toast}
                i18n={i18n}
              />
            )
      }
    />
  );
}
