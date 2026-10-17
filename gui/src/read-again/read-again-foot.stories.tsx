import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { scoresReadingText } from "../scores/scores-page";
import { i18nOf } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { ReadAgainFoot, type ReadAgainFootProps } from "./read-again-foot";

// The navigation foot pads its row: here as on a touch screen, with no arrow beside it.
const FOOT = { width: 240, borderTop: 1, borderColor: "divider", pl: 3, pr: 1.5, py: 1.5 } as const;

type Args = Omit<ReadAgainFootProps, "i18n">;

const meta = {
  title: "Buttons/ReadAgainFoot",
  tags: ["read-again"],
  render: (args, { globals }) => (
    <Box sx={FOOT}>
      <ReadAgainFoot {...args} i18n={i18nOf(globals)} />
    </Box>
  ),
  args: {
    reading: false,
    canRead: true,
    fetchedAt: STORY_PROFILE.fetchedAt,
    onRead: fn(),
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** At the foot of the side panel: when the page was read, and the button that reads it again. */
export const LastUpdated: Story = {};

export const Reading: Story = { args: { reading: true, canRead: false } };

/** A walk's progress stands in for the time. */
export const WithProgress: Story = {
  args: { reading: true, canRead: false },
  render: (args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Box sx={FOOT}>
        <ReadAgainFoot
          {...args}
          progress={scoresReadingText(i18n, { step: "details", done: 12, total: 40 }, null)}
          i18n={i18n}
        />
      </Box>
    );
  },
};

/** On Scores, a press held six seconds reads every score again, a ring filling meanwhile. */
export const HoldsForMore: Story = { args: { onHeld: fn() } };
