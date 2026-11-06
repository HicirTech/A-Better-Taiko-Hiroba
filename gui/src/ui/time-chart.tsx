import { Box, useTheme } from "@mui/material";
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  type ChartScale,
  chartScale,
  gradientStops,
  nearestPlace,
  spreadPlaces,
  timeSpan,
} from "./chart-scale";
import { VISUALLY_HIDDEN } from "./visually-hidden";

const PLOT_PX = 150;
const TOP_PX = 8;
const BOTTOM_PX = 22;
const RIGHT_PX = 12;
/** A band's label beside the chart: as tall as its icon, wide enough for its icon and a figure. */
const LABEL_ROW_PX = 24;
const LABELS_PX = 88;
/** Between the plot and its labels. */
const LABELS_GAP_PX = 8;
/** About how wide a date on the axis is. */
const DATE_PX = 64;
/** How wide a figure's mark of the axis is, per character of the caption's size. */
const AXIS_CHAR_PX = 7;
const DOT_PX = 3;
const CHOSEN_DOT_PX = 5;
const DASHED = "4 4";
/** As the rating radar fills its shape, so the page's charts read alike. */
const AREA_OPACITY = 0.2;

/** Where a chart draws: a time's place across and a value's place down, in pixels. */
interface ChartFrame {
  readonly x: (at: number) => number;
  readonly y: (value: number) => number;
  readonly top: number;
  readonly bottom: number;
  /** The whole chart's height, its axis's dates too. */
  readonly height: number;
}

function useWidth() {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = box.current;
    if (element === null) {
      return;
    }
    const measure = () => {
      // A chart hidden with its page measures nothing: it keeps the width it had.
      if (element.clientWidth > 0) {
        setWidth(element.clientWidth);
      }
    };
    measure();
    const measured = new ResizeObserver(measure);
    measured.observe(element);
    return () => measured.disconnect();
  }, []);
  return { box, width };
}

/** The axes of a chart over time, and which of its times is chosen and told under it. */
function TimeChart({
  id,
  label,
  times,
  scale,
  format,
  dateOf,
  plotPx = PLOT_PX,
  rightPx = RIGHT_PX,
  side,
  readout,
  children,
}: {
  readonly id: string;
  readonly label: string;
  /** In milliseconds, oldest first. */
  readonly times: readonly number[];
  readonly scale: ChartScale;
  readonly format: (value: number) => string;
  readonly dateOf: (at: number) => string;
  /** How tall the plot is. */
  readonly plotPx?: number;
  /** The room to the plot's right. */
  readonly rightPx?: number;
  /** What stands in `LABELS_PX` at the chart's right, over its room there. */
  readonly side?: (frame: ChartFrame, chosen: number) => ReactNode;
  /** What is told of the time at a place, under the chart. */
  readonly readout?: (place: number) => ReactNode;
  readonly children: (frame: ChartFrame, chosen: number) => ReactNode;
}) {
  const { palette, typography } = useTheme();
  const { box, width } = useWidth();
  const [picked, setPicked] = useState<number | null>(null);
  const last = times.length - 1;
  const chosen = Math.min(picked ?? last, last);
  const left = Math.max(...scale.ticks.map((tick) => format(tick).length)) * AXIS_CHAR_PX + 4;
  const { first, span } = timeSpan(times);
  const across = Math.max(width - left - rightPx, 1);
  const chartPx = TOP_PX + plotPx + BOTTOM_PX;
  const frame: ChartFrame = {
    x: (at) => left + (span === 0 ? across / 2 : ((at - first) / span) * across),
    y: (value) => TOP_PX + ((scale.high - value) / (scale.high - scale.low)) * plotPx,
    top: TOP_PX,
    bottom: TOP_PX + plotPx,
    height: chartPx,
  };
  const pickAt = (event: MouseEvent<HTMLDivElement>) => {
    const inside = event.clientX - event.currentTarget.getBoundingClientRect().left - left;
    setPicked(nearestPlace(times, first + (inside / across) * span));
  };
  const pickByKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (step !== undefined) {
      event.preventDefault();
      setPicked(Math.min(Math.max(chosen + step, 0), last));
    }
  };
  const axisWords = { fontSize: typography.caption.fontSize, fill: palette.text.secondary };
  const chosenAt = times[chosen] ?? first;
  const chosenX = frame.x(chosenAt);
  const lastX = left + across;
  const dateY = frame.bottom + BOTTOM_PX - 6;
  return (
    <Box id={id} sx={{ position: "relative" }}>
      <Box
        ref={box}
        role="group"
        aria-label={label}
        tabIndex={0}
        onClick={pickAt}
        // A press picks on a touch screen: the mouse picks as it moves, a finger may be swiping.
        onMouseMove={pickAt}
        onKeyDown={pickByKey}
        sx={{
          // Tall from the start: a fold opening measures it before its width is known.
          height: chartPx,
          cursor: "crosshair",
          "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
        }}
      >
        {width > 0 && (
          <svg width={width} height={chartPx} style={{ display: "block" }} aria-hidden="true">
            {scale.ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={left}
                  x2={left + across}
                  y1={frame.y(tick)}
                  y2={frame.y(tick)}
                  stroke={palette.divider}
                />
                <text
                  x={left - 4}
                  y={frame.y(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  {...axisWords}
                >
                  {format(tick)}
                </text>
              </g>
            ))}
            {children(frame, chosen)}
            {chosenX - left > 1.5 * DATE_PX && (
              <text x={left} y={dateY} textAnchor="start" {...axisWords}>
                {dateOf(first)}
              </text>
            )}
            {lastX - chosenX > 1.5 * DATE_PX && (
              <text x={lastX} y={dateY} textAnchor="end" {...axisWords}>
                {dateOf(first + span)}
              </text>
            )}
            <text
              id={`${id}-date`}
              x={chosenX}
              y={dateY}
              textAnchor={
                chosenX - left < DATE_PX / 2
                  ? "start"
                  : lastX - chosenX < DATE_PX / 2
                    ? "end"
                    : "middle"
              }
              {...axisWords}
              fill={palette.text.primary}
            >
              {dateOf(chosenAt)}
            </text>
          </svg>
        )}
      </Box>
      {side !== undefined && width > 0 && (
        <Box sx={{ position: "absolute", top: 0, right: 0, width: LABELS_PX, height: chartPx }}>
          {side(frame, chosen)}
        </Box>
      )}
      <Box id={`${id}-readout`} aria-live="polite" data-place={chosen}>
        <Box component="span" sx={VISUALLY_HIDDEN}>
          {dateOf(chosenAt)}
        </Box>
        {readout?.(chosen)}
      </Box>
    </Box>
  );
}

export interface LinePoint {
  /** In milliseconds. */
  readonly at: number;
  readonly value: number;
  /** Worked out rather than read: the line on from it is dashed. */
  readonly estimated?: boolean;
}

/** One value over time as a line, with the chosen point told under it. */
export function LineChart({
  id,
  label,
  points,
  format,
  dateOf,
  readout,
}: {
  readonly id: string;
  readonly label: string;
  /** Oldest first. */
  readonly points: readonly LinePoint[];
  readonly format: (value: number) => string;
  readonly dateOf: (at: number) => string;
  readonly readout: (place: number) => ReactNode;
}) {
  const { palette } = useTheme();
  const values = points.map(({ value }) => value);
  return (
    <TimeChart
      id={id}
      label={label}
      times={points.map(({ at }) => at)}
      scale={chartScale(Math.min(...values), Math.max(...values))}
      format={format}
      dateOf={dateOf}
      readout={readout}
    >
      {({ x, y, top, bottom }, chosen) => (
        <>
          {points.slice(1).map((point, place) => {
            const before = points[place] ?? point;
            return (
              <line
                key={point.at}
                x1={x(before.at)}
                y1={y(before.value)}
                x2={x(point.at)}
                y2={y(point.value)}
                stroke={palette.primary.main}
                strokeWidth={2}
                {...(before.estimated === true && { strokeDasharray: DASHED })}
              />
            );
          })}
          <line
            x1={x(points[chosen]?.at ?? 0)}
            x2={x(points[chosen]?.at ?? 0)}
            y1={top}
            y2={bottom}
            stroke={palette.text.disabled}
          />
          {points.map((point, place) => (
            <circle
              key={point.at}
              cx={x(point.at)}
              cy={y(point.value)}
              r={place === chosen ? CHOSEN_DOT_PX : DOT_PX}
              fill={palette.primary.main}
            />
          ))}
        </>
      )}
    </TimeChart>
  );
}

export interface AreaBand {
  readonly id: string;
  readonly colour: string;
}

/** Several counts over time, stacked from the first band up, each labelled at the chart's right. */
export function AreaChart({
  id,
  label,
  times,
  bands,
  counts,
  format,
  dateOf,
  legend,
}: {
  readonly id: string;
  readonly label: string;
  /** In milliseconds, oldest first. */
  readonly times: readonly number[];
  readonly bands: readonly AreaBand[];
  /** For each time, each band's count, in the bands' order. */
  readonly counts: readonly (readonly number[])[];
  readonly format: (value: number) => string;
  readonly dateOf: (at: number) => string;
  /** The bands' labels at the time at a place, each centred at its top, in the bands' order. */
  readonly legend: (place: number, tops: readonly number[]) => ReactNode;
}) {
  const { palette } = useTheme();
  const { first, span } = timeSpan(times);
  const total = (row: readonly number[], upTo = row.length) =>
    row.slice(0, upTo).reduce((sum, count) => sum + count, 0);
  const topsOf = ({ y, height }: ChartFrame, chosen: number) => {
    // The stack's top band stands highest: reversed, the points run down the chart as labels do.
    const points = bands.map((_, place) => y(total(counts[chosen] ?? [], place + 1))).reverse();
    const row = LABEL_ROW_PX;
    return [...spreadPlaces(points, row, row / 2, height - row / 2)].reverse();
  };
  return (
    <TimeChart
      id={id}
      label={label}
      times={times}
      scale={chartScale(0, Math.max(...counts.map((row) => total(row))))}
      format={format}
      dateOf={dateOf}
      plotPx={Math.max(PLOT_PX, bands.length * LABEL_ROW_PX)}
      rightPx={LABELS_PX + LABELS_GAP_PX}
      side={(frame, chosen) => legend(chosen, topsOf(frame, chosen))}
    >
      {({ x, y, top, bottom }, chosen) => (
        <>
          {bands.map((band, place) => {
            const edge = (upTo: number) =>
              times.map((at, time) => `${x(at)},${y(total(counts[time] ?? [], upTo))}`);
            const upper = edge(place + 1);
            const stops = gradientStops(band.colour);
            const paintId = `${id}-${band.id}-paint`;
            const paint = stops === null ? band.colour : `url(#${paintId})`;
            const counted = counts[chosen] ?? [];
            return (
              <g key={band.id}>
                {stops !== null && (
                  // In the chart's own units: a line that runs flat has no box to fit a gradient to.
                  <defs>
                    <linearGradient
                      id={paintId}
                      gradientUnits="userSpaceOnUse"
                      x1={x(first)}
                      x2={x(first + span)}
                      y1={0}
                      y2={0}
                    >
                      {stops.map((colour, stop) => (
                        <stop key={colour} offset={stop / (stops.length - 1)} stopColor={colour} />
                      ))}
                    </linearGradient>
                  </defs>
                )}
                <polygon
                  data-band={band.id}
                  points={[...upper, ...edge(place).reverse()].join(" ")}
                  fill={paint}
                  fillOpacity={AREA_OPACITY}
                />
                {counts.some((row) => (row[place] ?? 0) > 0) && (
                  <polyline points={upper.join(" ")} fill="none" stroke={paint} strokeWidth={2} />
                )}
                {(counted[place] ?? 0) > 0 && (
                  <circle
                    cx={x(times[chosen] ?? 0)}
                    cy={y(total(counted, place + 1))}
                    r={DOT_PX}
                    fill={paint}
                  />
                )}
              </g>
            );
          })}
          <line
            x1={x(times[chosen] ?? 0)}
            x2={x(times[chosen] ?? 0)}
            y1={top}
            y2={bottom}
            stroke={palette.text.disabled}
          />
        </>
      )}
    </TimeChart>
  );
}
