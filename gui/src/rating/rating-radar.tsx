import { Box, useTheme } from "@mui/material";

const WIDTH = 300;
const HEIGHT = 250;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const RADIUS = 80;
const LABEL_RADIUS = RADIUS + 22;
/** The rings behind the figures, as shares of the scale. */
const RINGS: readonly number[] = [0.25, 0.5, 0.75, 1];
const LINE_HEIGHT = 15;

export interface RadarFigure {
  readonly name: string;
  readonly value: number;
}

/** The scale's ends: from a whole step under the lowest figure to the step over the highest. */
export function radarScale(values: readonly number[]): {
  readonly low: number;
  readonly high: number;
} {
  const low = Math.max(0, Math.floor(Math.min(...values)) - 1);
  return { low, high: Math.max(low + 1, Math.ceil(Math.max(...values))) };
}

/** A player's figures on axes around a centre: a farther corner is a higher figure. */
export function RatingRadar({
  figures,
  format,
}: {
  readonly figures: readonly RadarFigure[];
  readonly format: (value: number) => string;
}) {
  const { palette, typography } = useTheme();
  const { low, high } = radarScale(figures.map((figure) => figure.value));
  const at = (index: number, radius: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / figures.length;
    return { x: CENTER_X + radius * Math.cos(angle), y: CENTER_Y + radius * Math.sin(angle) };
  };
  const ring = (radius: number) =>
    figures
      .map((_, index) => at(index, radius))
      .map(({ x, y }) => `${x},${y}`)
      .join(" ");
  const shape = figures
    .map((figure, index) => {
      const share = Math.min(Math.max((figure.value - low) / (high - low), 0), 1);
      const { x, y } = at(index, RADIUS * share);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <Box
      component="svg"
      id="rating-radar"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={figures.map((figure) => `${figure.name} ${format(figure.value)}`).join(", ")}
      sx={{ width: "100%", maxWidth: WIDTH, height: "auto", flexShrink: 0 }}
    >
      {RINGS.map((share) => (
        <polygon key={share} points={ring(RADIUS * share)} fill="none" stroke={palette.divider} />
      ))}
      {figures.map((figure, index) => {
        const { x, y } = at(index, RADIUS);
        return (
          <line
            key={figure.name}
            x1={CENTER_X}
            y1={CENTER_Y}
            x2={x}
            y2={y}
            stroke={palette.divider}
          />
        );
      })}
      <polygon
        points={shape}
        fill={palette.primary.main}
        fillOpacity={0.2}
        stroke={palette.primary.main}
        strokeWidth={2}
      />
      {figures.map((figure, index) => {
        const { x, y } = at(index, LABEL_RADIUS);
        const anchor = Math.abs(x - CENTER_X) < 1 ? "middle" : x > CENTER_X ? "start" : "end";
        return (
          <text
            key={figure.name}
            x={x}
            y={y - LINE_HEIGHT / 2}
            textAnchor={anchor}
            fontSize={typography.caption.fontSize}
            fill={palette.text.secondary}
          >
            <tspan x={x}>{figure.name}</tspan>
            <tspan
              x={x}
              dy={LINE_HEIGHT}
              fontSize={typography.rowLine.fontSize}
              fontWeight={typography.fontWeightBold}
              fill={palette.text.primary}
            >
              {format(figure.value)}
            </tspan>
          </text>
        );
      })}
    </Box>
  );
}
