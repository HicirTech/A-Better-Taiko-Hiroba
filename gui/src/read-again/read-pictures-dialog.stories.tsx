import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { ReadPicturesDialog } from "./read-pictures-dialog";

interface Args {
  readonly onAnswer: (confirmed: boolean) => void;
}

const meta = {
  title: "Dialogs/ReadPicturesDialog",
  tags: ["read-again"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => <ReadPicturesDialog {...args} open i18n={i18nOf(globals)} />,
  args: { onAnswer: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Asks before a page's pictures are read again from Hiroba, in place of the ones kept. */
export const Asking: Story = {};
