import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { PlayMenu } from "./play-menu";

interface Args {
  readonly onAddToSet: () => void;
  readonly onClose: () => void;
}

const meta = {
  title: "Menus/PlayMenu",
  tags: ["history"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => (
    <PlayMenu {...args} at={{ x: 160, y: 120 }} i18n={i18nOf(globals)} />
  ),
  args: { onAddToSet: fn(), onClose: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A recent play's right-click menu on a PC, opened where the pointer was. */
export const RightClicked: Story = {};
