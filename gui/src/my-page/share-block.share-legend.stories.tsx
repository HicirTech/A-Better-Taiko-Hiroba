import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { PictureLane } from "../pictures/picture-lane";
import { touchOf } from "../story-kit/devices";
import { i18nOf, STORY_TOAST, type StoryGlobals } from "../story-kit/env";
import { rankShares } from "../story-kit/shares";
import { STORY_LANE, WAITING_LANE } from "../story-kit/story-pictures";
import { ShareLegend } from "./share-block";

const legend = (lane: PictureLane, globals: StoryGlobals) => {
  const i18n = i18nOf(globals);
  return (
    <Box sx={{ maxWidth: 480 }}>
      <ShareLegend
        items={rankShares(i18n)}
        lane={lane}
        toast={touchOf(globals) ? STORY_TOAST : undefined}
        i18n={i18n}
      />
    </Box>
  );
};

const meta = {
  title: "Stats/ShareLegend",
  tags: ["my-page"],
  render: (_args, { globals }) => legend(STORY_LANE, globals),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hiroba's icons and percents; a hover names each on a PC, a long press by Toast on Android. */
export const Icons: Story = {};

/** A coloured dot stands in for each icon until it comes. */
export const IconsOnTheirWay: Story = {
  render: (_args, { globals }) => legend(WAITING_LANE, globals),
};
