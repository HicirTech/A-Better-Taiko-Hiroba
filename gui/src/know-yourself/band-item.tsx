import type { Translator } from "@abth/i18n";
import { Box, FormHelperText } from "@mui/material";
import { useMemo } from "react";

import { ScoresIcon } from "../navigation/page-icons";
import { gatheringGroups, goodScores } from "./good-scores";
import { byBpm, byHitsPerSecond, type GroupKey, groupId } from "./groups";
import { KnowItem } from "./know-item";
import type { KnownChart } from "./known-charts";
import { clearCounts } from "./ladder";
import type { PageParts } from "./page-parts";
import { clearSegments } from "./segments";
import { ShareRows } from "./share-rows";

/** What the charts are banded by: hits per second, or BPM. */
export type BandView = "perSecond" | "bpm";

const MARK = {
  display: "inline-flex",
  ml: 0.5,
  color: "primary.main",
  "& .MuiSvgIcon-root": { fontSize: "1.125rem" },
} as const;

/** The trophy marking where the top scores are most common; named where no words are beside it. */
function TopScoresMark({ label }: { readonly label: string | null }) {
  return label === null ? (
    <Box component="span" aria-hidden sx={MARK}>
      <ScoresIcon />
    </Box>
  ) : (
    <Box component="span" role="img" aria-label={label} title={label} sx={MARK}>
      <ScoresIcon />
    </Box>
  );
}

function labelOf(key: GroupKey, view: BandView, { t, number, locale }: Translator): string {
  switch (key.kind) {
    case "stars":
      return t("picker.level", { level: key.stars });
    case "changing":
      return t("know.changing");
    case "unknown":
      return t("know.unknown");
    case "band": {
      if (key.from === null) {
        return `<${number(key.to ?? 0)}`;
      }
      if (key.to === null) {
        return `≥${number(key.from)}`;
      }
      const tenths = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
      // A band of BPM ends below its next one's whole number; a band of hits/s at it.
      return view === "perSecond"
        ? `${tenths.format(key.from)}–${tenths.format(key.to)}`
        : `${number(key.from)}–${number(key.to - 1)}`;
    }
  }
}

/** The crowns by hits per second, or by BPM, and the band where the top scores are most common. */
export function BandItem({
  view,
  charts,
  parts,
}: {
  readonly view: BandView;
  readonly charts: readonly KnownChart[];
  readonly parts: PageParts;
}) {
  const { i18n, lane, toast, openedIn, toggleIn, gapList } = parts;
  const { t, locale } = i18n;
  const groups = useMemo(
    () => (view === "perSecond" ? byHitsPerSecond(charts) : byBpm(charts)),
    [view, charts],
  );
  const marked = useMemo(() => gatheringGroups(groups, goodScores(charts)), [groups, charts]);
  const best = groups.filter(({ key }) => marked.has(groupId(key)));
  const ranges = best.filter(({ key }) => key.kind === "band").map(({ key }) => key);
  const both = new Intl.ListFormat(locale, { type: "conjunction" });
  const summary =
    ranges.length > 0
      ? t(view === "perSecond" ? "know.best.perSecond" : "know.best.bpm", {
          range: both.format(ranges.map((key) => labelOf(key, view, i18n))),
        })
      : best.length > 0
        ? t("know.best.changing")
        : t("know.best.none");
  const id = view === "perSecond" ? "know-per-second" : "know-bpm";
  return (
    <KnowItem
      id={id}
      title={t(view === "perSecond" ? "know.perSecond" : "know.bpm")}
      summary={summary}
      details={() => (
        <>
          <FormHelperText
            id={`${id}-help`}
            sx={{ m: 0, mb: 1, display: "flex", alignItems: "center" }}
          >
            <TopScoresMark label={null} />
            <Box component="span" sx={{ ml: 0.5 }}>
              {t("know.reach.help")}
            </Box>
          </FormHelperText>
          <ShareRows
            id={`${id}-rows`}
            segments={clearSegments(i18n)}
            rows={groups.map(({ key, charts: inGroup }) => ({
              id: groupId(key),
              label: labelOf(key, view, i18n),
              counts: clearCounts(inGroup),
              badge: marked.has(groupId(key)) && <TopScoresMark label={t("know.reach.help")} />,
              list:
                key.kind === "unknown" ? null : gapList(`${id}-rows-${groupId(key)}-gaps`, inGroup),
            }))}
            legend={clearCounts(charts)}
            opened={openedIn(view)}
            onToggle={toggleIn(view)}
            lane={lane}
            toast={toast}
            i18n={i18n}
          />
        </>
      )}
    />
  );
}
