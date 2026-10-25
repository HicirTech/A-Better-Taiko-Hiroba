import type { NoteDensity } from "@abth/core";
import { Box, useTheme } from "@mui/material";

import { textSize } from "../theme/app-theme";

const HEIGHT = 120;

const AXIS = { color: "text.secondary", fontSize: textSize("caption"), lineHeight: 1 } as const;

/** "2:05" for 125 seconds. */
export function clockText(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** The busiest second: its count, and when it starts after the first note. */
export function peakOf({ perSecond }: NoteDensity): {
  readonly count: number;
  readonly at: number;
} {
  const count = Math.max(0, ...perSecond);
  return { count, at: Math.max(0, perSecond.indexOf(count)) };
}

/** The notes in each second as a line over the song, the busiest second at the top. */
export function DensityLine({
  density,
  label,
}: {
  readonly density: NoteDensity;
  /** What the line shows, for a screen reader. */
  readonly label: string;
}) {
  const { palette } = useTheme();
  const { perSecond, seconds } = density;
  const top = Math.max(1, peakOf(density).count);
  const width = Math.max(1, perSecond.length - 1);
  const line = perSecond.map((count, at) => `${at},${top - count}`).join(" ");
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 0.75, rowGap: 0.5 }}>
      <Box
        aria-hidden
        sx={{
          ...AXIS,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          textAlign: "right",
        }}
      >
        <span>{top}</span>
        <span>0</span>
      </Box>
      {/* Stretched to the width, so each second has room; the line keeps its own thickness. */}
      <svg
        id="song-density-line"
        role="img"
        aria-label={label}
        viewBox={`0 0 ${width} ${top}`}
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: HEIGHT, overflow: "visible" }}
      >
        <polygon
          points={`0,${top} ${line} ${width},${top}`}
          fill={palette.primary.main}
          fillOpacity={0.15}
        />
        <polyline
          points={line}
          fill="none"
          stroke={palette.primary.main}
          strokeWidth={2}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span aria-hidden />
      <Box aria-hidden sx={{ ...AXIS, display: "flex", justifyContent: "space-between" }}>
        <span>{clockText(0)}</span>
        <span>{clockText(seconds)}</span>
      </Box>
    </Box>
  );
}
