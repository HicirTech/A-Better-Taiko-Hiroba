import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { ReactNode } from "react";
import type { PictureLane } from "../pictures/picture-lane";
import { DIFFICULTY_COLOUR, DIFFICULTY_LABEL } from "../shared/song-catalogue/genre-look";
import type { Difficulty } from "../shared/song-catalogue/types";
import { CourseIcon } from "./course-icon";
import { LEVEL_BADGE_PX, LEVEL_BADGES_LOOK } from "./level-badges";

/** The side of a row's marks: a chart's difficulty icon, and a play's crown, rank and options. */
export const CHART_MARK_PX = 20;
/** A rank's mark: as much wider than tall as Hiroba's rank art. */
export const RANK_MARK_PX = Math.round((CHART_MARK_PX * 128) / 96);

const MARKS = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "2px",
  flexShrink: 0,
  "& .chart-marks-line": { display: "flex", alignItems: "flex-start", gap: 0.5 },
  // The badge under the middle of the mark over it: a rank is wider than the badge.
  "&:has(> .chart-marks-line > .rank-mark:last-child) > .level-badge": {
    mr: `${(RANK_MARK_PX - LEVEL_BADGE_PX) / 2}px`,
  },
  ...LEVEL_BADGES_LOOK,
} as const;

/** A chart's marks, its level's badge under them at the right, in its difficulty's colour. */
export function ChartMarks({
  difficulty,
  level,
  lane,
  order,
  i18n,
  children,
}: {
  readonly difficulty: Difficulty;
  /** Null for a chart the song list does not know: Hiroba's difficulty icon stands for it. */
  readonly level: number | null;
  readonly lane: PictureLane;
  readonly order: number;
  readonly i18n: Translator;
  /** The page's own marks: a play's crown, rank and options, what a chart lacks. */
  readonly children?: ReactNode;
}) {
  const { t } = i18n;
  const name = t(DIFFICULTY_LABEL[difficulty]);
  return (
    <Box component="span" className="play-marks" data-difficulty={difficulty} sx={MARKS}>
      <span className="chart-marks-line">
        {level === null && (
          <CourseIcon
            difficulty={difficulty}
            lane={lane}
            order={order}
            label={name}
            px={CHART_MARK_PX}
          />
        )}
        {children}
      </span>
      {level !== null && (
        <span
          className="level-badge"
          role="img"
          aria-label={t("song.level", { difficulty: name, level })}
          style={{ backgroundColor: DIFFICULTY_COLOUR[difficulty] }}
        >
          {level}
        </span>
      )}
    </Box>
  );
}
