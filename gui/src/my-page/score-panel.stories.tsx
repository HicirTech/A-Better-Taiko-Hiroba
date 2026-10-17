import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { PictureAnswer } from "../pictures/picture-lane";
import { i18nOf } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { storyAnswer } from "../story-kit/story-pictures";
import { ScorePanel } from "./score-panel";

interface Args {
  readonly answer: PictureAnswer | undefined;
}

const meta = {
  title: "Pictures/ScorePanel",
  tags: ["my-page"],
  render: ({ answer }, { globals }) => (
    <Box sx={{ width: 420 }}>
      <ScorePanel
        panel={STORY_PROFILE.panel}
        crowns={STORY_PROFILE.crowns}
        answer={answer}
        i18n={i18nOf(globals)}
        ref={null}
      />
    </Box>
  ),
  args: { answer: storyAnswer({ kind: "scorePanel" }) },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hiroba's panel art with the counts written where Hiroba writes them. */
export const Shown: Story = {};

/** The counts over a stand-in while the art is on its way. */
export const OnItsWay: Story = { args: { answer: undefined } };

export const Failed: Story = { args: { answer: { failure: "scorePanel=notPng status=404" } } };
