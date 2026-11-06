import { Box, Typography } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CROWN_COLOUR, UNCLEARED_COLOUR } from "../shared/panel-colours";
import { i18nOf } from "../story-kit/env";
import { AreaChart, LineChart, type LinePoint } from "./time-chart";

const DAYS = ["2026-09-20", "2026-10-02", "2026-10-13", "2026-10-24", "2026-10-28"].map((day) =>
  Date.parse(`${day}T10:00:00.000Z`),
);
const at = (place: number) => DAYS[place] ?? 0;

const line = (values: readonly number[], estimatedUpTo = -1): readonly LinePoint[] =>
  values.map((value, place) => ({ at: at(place), value, estimated: place <= estimatedUpTo }));

const WIDE = { maxWidth: 640 } as const;

const meta = {
  title: "Stats/TimeChart",
  tags: ["ui"],
  render: (_args, { globals }) => {
    const { number, date } = i18nOf(globals);
    const points = line([812_340, 905_320, 951_200, 951_200, 1_002_570]);
    return (
      <Box sx={WIDE}>
        <LineChart
          id="story-line"
          label="High score"
          points={points}
          format={number}
          dateOf={date}
          readout={(place) => <Typography>{number(points[place]?.value ?? 0)}</Typography>}
        />
      </Box>
    );
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A chart's high score: a press, or the mouse, chooses the point told under it. */
export const ScoreOverTime: Story = {};

/** The rating's earlier points are worked out: the line on from them is dashed. */
export const WithAnEstimate: Story = {
  render: (_args, { globals }) => {
    const { date } = i18nOf(globals);
    const points = line([8.41, 8.55, 8.682, 8.753, 8.753], 2);
    const format = (value: number) => value.toFixed(2);
    return (
      <Box sx={WIDE}>
        <LineChart
          id="story-estimate"
          label="Rating"
          points={points}
          format={format}
          dateOf={date}
          readout={(place) => <Typography>{format(points[place]?.value ?? 0)}</Typography>}
        />
      </Box>
    );
  },
};

/** Two points, a day apart: the least a line draws. */
export const TwoPoints: Story = {
  render: (_args, { globals }) => {
    const { number, date } = i18nOf(globals);
    const points = line([900_000, 900_000]);
    return (
      <Box sx={WIDE}>
        <LineChart
          id="story-two"
          label="High score"
          points={points}
          format={number}
          dateOf={date}
          readout={(place) => <Typography>{number(points[place]?.value ?? 0)}</Typography>}
        />
      </Box>
    );
  },
};

const BANDS = [
  { id: "donderful", colour: CROWN_COLOUR.donderful },
  { id: "gold", colour: CROWN_COLOUR.gold },
  { id: "silver", colour: CROWN_COLOUR.silver },
  { id: "played", colour: UNCLEARED_COLOUR.played },
];
const COUNTS = [
  [0, 380, 400, 110],
  [0, 396, 410, 108],
  [0, 408, 417, 107],
  [1, 422, 412, 107],
  [1, 423, 411, 107],
];

/** How many charts held each crown, stacked from the best up, each labelled at its point. */
export const CrownsOverTime: Story = {
  render: (_args, { globals }) => <Stacked counts={COUNTS} globals={globals} />,
};

/** Equal values and none at all: the labels stand apart, in the stack's order. */
export const EqualCounts: Story = {
  render: (_args, { globals }) => (
    <Stacked
      counts={[
        [0, 0, 400, 400],
        [0, 0, 400, 400],
        [0, 0, 400, 400],
        [0, 0, 400, 400],
        [0, 0, 400, 400],
      ]}
      globals={globals}
    />
  ),
};

function Stacked({
  counts,
  globals,
}: {
  readonly counts: readonly (readonly number[])[];
  readonly globals: Parameters<typeof i18nOf>[0];
}) {
  const { number, date } = i18nOf(globals);
  return (
    <Box sx={WIDE}>
      <AreaChart
        id="story-area"
        label="Crowns"
        times={DAYS}
        bands={BANDS}
        counts={counts}
        format={number}
        dateOf={date}
        legend={(place, tops) =>
          tops.map((top, band) => (
            <Typography
              key={BANDS[band]?.id}
              component="span"
              variant="body2"
              sx={{ position: "absolute", left: 0, top, transform: "translateY(-50%)" }}
            >
              {number(counts[place]?.[band] ?? 0)}
            </Typography>
          ))
        }
      />
    </Box>
  );
}
