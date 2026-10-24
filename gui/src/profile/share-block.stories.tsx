import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { touchOf } from "../story-kit/devices";
import { i18nOf, STORY_TOAST } from "../story-kit/env";
import { rankShares } from "../story-kit/shares";
import { STORY_LANE } from "../story-kit/story-pictures";
import { ShareBlock } from "./share-block";

const meta = {
  title: "Stats/ShareBlock",
  tags: ["profile"],
  render: (_args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Box sx={{ maxWidth: 480 }}>
        <ShareBlock
          id="story-ranks"
          heading={i18n.t("panel.ranks")}
          items={rankShares(i18n)}
          lane={STORY_LANE}
          toast={touchOf(globals) ? STORY_TOAST : undefined}
          i18n={i18n}
        />
      </Box>
    );
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A heading, one bar of shares and its legend, as GitHub shows a repository's languages. */
export const Ranks: Story = {};
