import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { i18nOf } from "../story-kit/env";
import { crownShares, rankShares } from "../story-kit/shares";
import { ShareBar } from "./share-block";

const meta = {
  title: "Stats/ShareBar",
  tags: ["profile"],
  render: (_args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Box sx={{ maxWidth: 480 }}>
        <ShareBar id="story-bar" items={rankShares(i18n)} i18n={i18n} />
      </Box>
    );
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Each item's share of one thin bar, in its colour. */
export const Ranks: Story = {};

export const Crowns: Story = {
  render: (_args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Box sx={{ maxWidth: 480 }}>
        <ShareBar id="story-bar" items={crownShares(i18n)} i18n={i18n} />
      </Box>
    );
  },
};

/** Nothing counted: an empty bar. */
export const Empty: Story = {
  render: (_args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Box sx={{ maxWidth: 480 }}>
        <ShareBar
          id="story-bar"
          items={rankShares(i18n).map((item) => ({ ...item, count: 0 }))}
          i18n={i18n}
        />
      </Box>
    );
  },
};
