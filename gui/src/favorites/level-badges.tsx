import type { Translator } from "@abth/i18n";
import { useContext, useState } from "react";

import { DIFFICULTY_COLOUR, DIFFICULTY_LABEL, DIFFICULTY_TEXT } from "./genre-look";
import { type Chart, ShownDifficultyContext, stackOf } from "./shown-difficulty";
import type { SongLook } from "./song-look";

const BADGE_PX = 20;
const GAP_PX = 2;
/** How much of a stacked badge shows beside the one over it. */
const PEEK_PX = 4;
const FRONT_LAYER = 10;

type Place = "before" | "front" | "after";

/** Spread into the sx of whatever draws level badges, such as a song's row or a list of them. */
export const LEVEL_BADGES_LOOK = {
  "& .level-badges": { display: "inline-flex", alignItems: "center", flexShrink: 0 },
  "& .level-stack": {
    p: 0,
    m: 0,
    border: 0,
    borderRadius: "4px",
    background: "none",
    font: "inherit",
    cursor: "pointer",
    "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: "2px" },
  },
  "& .level-badge": {
    position: "relative",
    boxSizing: "border-box",
    minWidth: BADGE_PX,
    height: BADGE_PX,
    px: "3px",
    borderRadius: "4px",
    color: DIFFICULTY_TEXT,
    fontSize: "0.6875rem",
    fontWeight: 700,
    lineHeight: `${BADGE_PX}px`,
    textAlign: "center",
    "@media (prefers-reduced-motion: no-preference)": { transition: "margin 160ms, color 160ms" },
  },
  "& .level-badge + .level-badge": { ml: `${GAP_PX}px` },
  "& .level-stack[aria-expanded='false'] .level-badge.before": {
    mr: `${-(BADGE_PX - PEEK_PX + GAP_PX)}px`,
    color: "transparent",
  },
  "& .level-stack[aria-expanded='false'] .level-badge.after": {
    ml: `${-(BADGE_PX - PEEK_PX)}px`,
    color: "transparent",
  },
} as const;

/** A badge per chart: the shown difficulty's in front, the rest stacked until clicked open. */
export function LevelBadges({
  levels,
  i18n,
}: {
  levels: NonNullable<SongLook["levels"]>;
  i18n: Translator;
}) {
  const { t } = i18n;
  const shown = useContext(ShownDifficultyContext);
  const [open, setOpen] = useState(false);
  const { before, front, after } = stackOf(levels, shown);
  const badge = ({ difficulty, level }: Chart, place: Place, layer: number) => {
    const label = t("song.level", { difficulty: t(DIFFICULTY_LABEL[difficulty]), level });
    return (
      <span
        key={difficulty}
        className={`level-badge ${place}`}
        role="img"
        aria-label={label}
        aria-hidden={(place !== "front" && !open) || undefined}
        title={label}
        data-difficulty={difficulty}
        data-place={place}
        style={{ backgroundColor: DIFFICULTY_COLOUR[difficulty], zIndex: layer }}
      >
        {level}
      </span>
    );
  };
  const badges = [
    ...before.map((chart, index) => badge(chart, "before", index)),
    ...front.map((chart, index) => badge(chart, "front", FRONT_LAYER + index)),
    ...after.map((chart, index) => badge(chart, "after", FRONT_LAYER - 1 - index)),
  ];

  if (before.length + after.length === 0) {
    return <span className="level-badges">{badges}</span>;
  }

  return (
    <button
      type="button"
      className="level-badges level-stack"
      aria-expanded={open}
      onClick={() => setOpen((now) => !now)}
    >
      {badges}
    </button>
  );
}
