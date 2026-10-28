import { useMemo } from "react";
import { FoldCard } from "../ui/fold-card";
import { byStars, type GroupKey, groupId } from "./groups";
import type { KnownChart } from "./known-charts";
import { clearCounts, wallOf } from "./ladder";
import type { PageParts } from "./page-parts";
import { clearSegments } from "./segments";
import { ShareRows } from "./share-rows";

/** Each star level's crowns, the first level the player is stuck at, and the charts to close. */
export function CrownsItem({
  charts,
  parts,
}: {
  readonly charts: readonly KnownChart[];
  readonly parts: PageParts;
}) {
  const { i18n, lane, toast, openedIn, toggleIn, gapList } = parts;
  const { t } = i18n;
  const groups = useMemo(() => byStars(charts), [charts]);
  const wall = wallOf(groups);
  const labelOf = (key: GroupKey) =>
    key.kind === "stars" ? t("picker.level", { level: key.stars }) : t("know.unknown");
  return (
    <FoldCard
      id="know-crowns"
      title={t("know.ladder")}
      summary={wall === null ? t("know.noWall") : t("know.wall", { stars: wall })}
      details={() => (
        <ShareRows
          id="know-crowns-rows"
          segments={clearSegments(i18n)}
          rows={[
            {
              id: "all",
              label: t("picker.all"),
              counts: clearCounts(charts),
              list: gapList("know-crowns-rows-all-gaps", charts),
            },
            ...groups.map(({ key, charts: inGroup }) => ({
              id: groupId(key),
              label: labelOf(key),
              counts: clearCounts(inGroup),
              list:
                key.kind === "unknown"
                  ? null
                  : gapList(`know-crowns-rows-${groupId(key)}-gaps`, inGroup),
            })),
          ]}
          legend={clearCounts(charts)}
          opened={openedIn("crowns")}
          onToggle={toggleIn("crowns")}
          lane={lane}
          toast={toast}
          i18n={i18n}
        />
      )}
    />
  );
}
