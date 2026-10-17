import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { storySong } from "../story-kit/songs";
import { STORY_CHART_PORT } from "../story-kit/story-port";
import { ChartPictures } from "./chart-pictures";
import type { ChartSource } from "./chart-source";
import type { ShownChart } from "./chart-viewer";

interface Args {
  readonly songNo: string;
  readonly source: ChartSource;
  readonly differs: boolean;
  readonly onOpen: (chart: ShownChart) => void;
}

const meta = {
  title: "Pictures/ChartPictures",
  tags: ["songs"],
  render: ({ songNo, source, differs, onOpen }, { globals }) => (
    <Box sx={{ maxWidth: 560 }}>
      <ChartPictures
        songNo={songNo}
        difficulty="oni"
        images={storySong(songNo).charts.oni?.images ?? []}
        source={source}
        differs={differs}
        tja={() => STORY_CHART_PORT.readChartTja(songNo)}
        generation={0}
        port={STORY_CHART_PORT}
        i18n={i18nOf(globals)}
        onOpen={onOpen}
      />
    </Box>
  ),
  args: { songNo: "1001", source: "tja", differs: false, onOpen: fn() },
  argTypes: { source: { control: "inline-radio", options: ["tja", "wiki"] } },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Drawn from the song's TJA, every branch stacked. */
export const Drawn: Story = {};

export const Branched: Story = { args: { songNo: "1005" } };

/** Notes that differ from the game's count: drawn anyway, with a line under the picture. */
export const NotesDiffer: Story = { args: { songNo: "1006", differs: true } };

/** No TJA: taiko.wiki's pictures, with a notice. */
export const NoChartFile: Story = { args: { songNo: "1003" } };

export const TaikoWikiPictures: Story = { args: { songNo: "1005", source: "wiki" } };
