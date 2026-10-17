import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { i18nOf } from "../story-kit/env";
import { storyDensity } from "../story-kit/story-port";
import { masterOf } from "./chart-density";
import { DensityLine } from "./density-line";

interface Args {
  readonly songNo: string;
}

const meta = {
  title: "Stats/DensityLine",
  tags: ["songs"],
  render: ({ songNo }, { globals }) => {
    const density = storyDensity(songNo).oni;
    return (
      <Box sx={{ maxWidth: 560 }}>
        {density !== undefined && (
          <DensityLine density={masterOf(density)} label={i18nOf(globals).t("difficulty.oni")} />
        )}
      </Box>
    );
  },
  args: { songNo: "1001" },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The notes in each second as a line over the song, the busiest second at the top. */
export const Line: Story = {};

/** A tempo that doubles halfway. */
export const TempoChanges: Story = { args: { songNo: "1005" } };
