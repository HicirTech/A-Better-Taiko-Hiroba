import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  type ShownDifficulty,
  ShownDifficultyContext,
} from "../shared/song-catalogue/shown-difficulty";
import { i18nOf } from "../story-kit/env";
import { storySong } from "../story-kit/songs";
import { LEVEL_BADGES_LOOK, LevelBadges } from "./level-badges";

interface Args {
  /** The stand-in song whose levels show. */
  readonly songNo: string;
  /** The difficulty Settings shows first. */
  readonly shown: ShownDifficulty;
}

const meta = {
  title: "Rows and lists/LevelBadges",
  tags: ["songs"],
  render: ({ songNo, shown }, { globals }) => (
    <ShownDifficultyContext value={shown}>
      <Box sx={LEVEL_BADGES_LOOK}>
        <LevelBadges levels={storySong(songNo).levels} i18n={i18nOf(globals)} />
      </Box>
    </ShownDifficultyContext>
  ),
  args: { songNo: "1005", shown: "oni" },
  argTypes: { shown: { control: "inline-radio", options: ["easy", "normal", "hard", "oni"] } },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Extreme and its inner chart in front, the rest stacked behind until a click spreads them. */
export const ExtremeInFront: Story = {};

export const EasyInFront: Story = { args: { shown: "easy" } };

/** No inner chart: Extreme alone in front. */
export const WithoutAnInnerChart: Story = { args: { songNo: "1001" } };
