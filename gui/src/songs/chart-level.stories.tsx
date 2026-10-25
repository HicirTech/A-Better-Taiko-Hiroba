import { Box, Stack } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { DIFFICULTIES, type Difficulty } from "../shared/song-catalogue/types";
import { i18nOf } from "../story-kit/env";
import { STORY_PLAYS } from "../story-kit/plays";
import { storySong } from "../story-kit/songs";
import { STORY_LANE } from "../story-kit/story-pictures";
import { ChartMarks } from "./chart-level";
import { PlayMarks } from "./play-marks";

interface Args {
  readonly difficulty: Difficulty;
  /** Null for a chart the song list does not know. */
  readonly level: number | null;
}

const meta = {
  title: "Rows and lists/ChartMarks",
  tags: ["songs"],
  // Marks fill a row's end and stand at its right: alone, they hug their content.
  render: ({ difficulty, level }, { globals }) => (
    <Box sx={{ display: "inline-flex" }}>
      <ChartMarks
        difficulty={difficulty}
        level={level}
        lane={STORY_LANE}
        order={0}
        i18n={i18nOf(globals)}
      />
    </Box>
  ),
  args: { difficulty: "oni", level: 10 },
  argTypes: {
    difficulty: { control: "inline-radio", options: DIFFICULTIES },
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The star level's badge in the difficulty's colour, named for screen readers with it. */
export const Level: Story = {};

/** A chart the song list does not know: Hiroba's icon of its difficulty stands for it. */
export const UnknownToTheSongList: Story = { args: { level: null } };

/** Every difficulty of a song with an inner chart, side by side. */
export const EveryDifficulty: Story = {
  render: (_args, { globals }) => {
    const i18n = i18nOf(globals);
    const { levels } = storySong("1005");
    return (
      <Stack direction="row" spacing={2}>
        {DIFFICULTIES.map((difficulty, order) => (
          <ChartMarks
            key={difficulty}
            difficulty={difficulty}
            level={levels[difficulty]}
            lane={STORY_LANE}
            order={order}
            i18n={i18n}
          />
        ))}
      </Stack>
    );
  },
};

/** A play's crown, rank and options over the level, as a play's row draws them. */
export const WithAPlaysMarks: Story = {
  render: ({ difficulty, level }, { globals }) => {
    const i18n = i18nOf(globals);
    const play = STORY_PLAYS[2];
    return (
      <Box sx={{ display: "inline-flex" }}>
        <ChartMarks difficulty={difficulty} level={level} lane={STORY_LANE} order={0} i18n={i18n}>
          {play !== undefined && <PlayMarks play={play} lane={STORY_LANE} order={0} i18n={i18n} />}
        </ChartMarks>
      </Box>
    );
  },
};
