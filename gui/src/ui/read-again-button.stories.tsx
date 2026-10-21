import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fireEvent, fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { found } from "../story-kit/steps";
import { ReadAgainButton } from "./read-again-button";

interface Args {
  readonly canRead: boolean;
  readonly reading: boolean;
  readonly onRead: () => void;
  readonly onHeld?: () => void;
}

const meta = {
  title: "Buttons/ReadAgainButton",
  tags: ["ui"],
  render: (args, { globals }) => (
    <ReadAgainButton
      {...args}
      id="story-read-again"
      label={i18nOf(globals).t("profile.readAgain")}
    />
  ),
  args: { canRead: true, reading: false, onRead: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The arrow that reads again, its words on hover. */
export const Idle: Story = {};

/** While it reads, a spinner stands in the arrow's room: the button keeps its size. */
export const Reading: Story = { args: { canRead: false, reading: true } };

/** Shut while it cannot read, such as while another read runs: grey, with no tooltip. */
export const Shut: Story = { args: { canRead: false } };

/** Where a long hold asks for more, a ring fills while the press is held. */
export const HeldForMore: Story = {
  args: { onHeld: fn() },
  play: async () => {
    fireEvent.pointerDown(await found("#story-read-again"), { button: 0 });
  },
};

/** Idle and reading side by side, as a details' head or the navigation's foot draws them. */
export const IdleAndReading: Story = {
  render: (args, { globals }) => {
    const label = i18nOf(globals).t("profile.readAgain");
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <ReadAgainButton {...args} id="story-read-again" label={label} />
        <ReadAgainButton {...args} id="story-reading" label={label} canRead={false} reading />
      </Box>
    );
  },
};
