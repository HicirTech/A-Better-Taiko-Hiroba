import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { i18nOf } from "../story-kit/env";
import { storySong } from "../story-kit/songs";
import { storyDensity } from "../story-kit/story-port";
import { ChartDensitySection, type DensityState } from "./chart-density";

interface Args {
  /** The stand-in song whose Extreme chart shows. */
  readonly songNo: string;
  readonly state: Pick<DensityState, "reading" | "failure">;
}

const meta = {
  title: "Stats/ChartDensitySection",
  tags: ["songs"],
  render: ({ songNo, state }, { globals }) => {
    const read = state.reading || state.failure !== null ? null : storyDensity(songNo);
    return (
      <Box sx={{ maxWidth: 560 }}>
        <ChartDensitySection
          state={{ ...state, read }}
          density={read?.oni}
          maxCombo={storySong(songNo).charts.oni?.maxCombo ?? null}
          i18n={i18nOf(globals)}
        />
      </Box>
    );
  },
  args: { songNo: "1001", state: { reading: false, failure: null } },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The notes in each second over the song, and the busiest second. */
export const Shown: Story = {};

/** A branched chart: its branches to choose from. */
export const Branched: Story = { args: { songNo: "1005" } };

/** The chart file's notes differ from the game's count: no line. */
export const NotesDiffer: Story = { args: { songNo: "1006" } };

export const Reading: Story = { args: { state: { reading: true, failure: null } } };

export const Failed: Story = { args: { state: { reading: false, failure: "unreachable" } } };

/** No chart file for the song. */
export const NoChartFile: Story = { args: { state: { reading: false, failure: "noChart" } } };
