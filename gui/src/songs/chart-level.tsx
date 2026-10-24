import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { ReactNode } from "react";

import { DIFFICULTY_COLOUR, DIFFICULTY_LABEL } from "../favorites/genre-look";
import { LEVEL_BADGES_LOOK } from "../favorites/level-badges";
import type { PictureLane } from "../pictures/picture-lane";
import type { Difficulty } from "../shared/song-catalogue/types";
import { CourseIcon } from "./course-icon";

/** The side of a row's marks: a chart's difficulty icon, and a play's crown, rank and options. */
export const CHART_MARK_PX = 20;

/** What a chart's marks show of it: Hiroba's icon for its difficulty, its star level, or both. */
export type ChartLevelShows = "icon" | "level" | "both";

const MARKS = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "2px",
  flexShrink: 0,
  "& .chart-marks-line": { display: "flex", alignItems: "flex-start", gap: 0.5 },
  ...LEVEL_BADGES_LOOK,
} as const;

/** The difficulty's icon first among a chart's marks, and its level under them at the right. */
export function ChartMarks({
  difficulty,
  level,
  shows = "both",
  lane,
  order,
  i18n,
  children,
}: {
  readonly difficulty: Difficulty;
  /** Null for a chart the song list does not know: the icon alone stands for it. */
  readonly level: number | null;
  readonly shows?: ChartLevelShows;
  readonly lane: PictureLane;
  readonly order: number;
  readonly i18n: Translator;
  /** The page's own marks after the icon: a play's crown, rank and options, what a chart lacks. */
  readonly children?: ReactNode;
}) {
  const { t } = i18n;
  const name = t(DIFFICULTY_LABEL[difficulty]);
  const label = level === null ? name : t("song.level", { difficulty: name, level });
  const withLevel = shows !== "icon" && level !== null;
  const withIcon = shows !== "level" || !withLevel;
  return (
    <Box component="span" className="play-marks" data-difficulty={difficulty} sx={MARKS}>
      <span className="chart-marks-line">
        {withIcon && (
          <CourseIcon
            difficulty={difficulty}
            lane={lane}
            order={order}
            label={label}
            px={CHART_MARK_PX}
          />
        )}
        {children}
      </span>
      {withLevel && (
        <span
          className="level-badge"
          {...(withIcon ? { "aria-hidden": true } : { role: "img", "aria-label": label })}
          style={{ backgroundColor: DIFFICULTY_COLOUR[difficulty] }}
        >
          {level}
        </span>
      )}
    </Box>
  );
}
