import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { touchOf } from "../story-kit/devices";
import { i18nOf, STORY_TOAST } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { STORY_LANE } from "../story-kit/story-pictures";
import { PanelCard } from "./panel-card";

const meta = {
  title: "Cards and sections/PanelCard",
  tags: ["my-page"],
  render: (_args, { globals }) => (
    <Box sx={{ maxWidth: 480 }}>
      <PanelCard
        crowns={STORY_PROFILE.crowns}
        ranks={STORY_PROFILE.panel.ranks}
        lane={STORY_LANE}
        toast={touchOf(globals) ? STORY_TOAST : undefined}
        i18n={i18nOf(globals)}
      />
    </Box>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Overview's score ranks and crowns, each a share block. */
export const RanksAndCrowns: Story = {};
