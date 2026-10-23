import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { ReadEveryPlayDialog } from "./read-every-play-dialog";

interface Args {
  readonly onAnswer: (confirmed: boolean) => void;
}

const meta = {
  title: "Dialogs/ReadEveryPlayDialog",
  tags: ["history"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => <ReadEveryPlayDialog {...args} open i18n={i18nOf(globals)} />,
  args: { onAnswer: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Asks before walking every recent play again, which takes minutes, with a way out. */
export const Asking: Story = {};
