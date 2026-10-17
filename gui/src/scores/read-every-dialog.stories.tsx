import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { STORY_SCORES } from "../story-kit/scores";
import { ReadEveryDialog } from "./read-every-dialog";

interface Args {
  readonly onAnswer: (confirmed: boolean) => void;
}

const meta = {
  title: "Dialogs/ReadEveryDialog",
  tags: ["scores"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => (
    <ReadEveryDialog {...args} open charts={STORY_SCORES.scores.length} i18n={i18nOf(globals)} />
  ),
  args: { onAnswer: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Asks before reading every score again, which takes minutes: how many charts, and a way out. */
export const Asking: Story = {};
