import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { STORY_HISTORY } from "../story-kit/costume";
import { i18nOf } from "../story-kit/env";
import { STORY_SET } from "../story-kit/profile";
import { CostumeHistoryDialog, type CostumeHistoryDialogProps } from "./costume-history-dialog";

type Args = Omit<CostumeHistoryDialogProps, "i18n">;

const meta = {
  title: "Dialogs/CostumeHistoryDialog",
  tags: ["my-page"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => <CostumeHistoryDialog {...args} i18n={i18nOf(globals)} />,
  args: { open: true, entries: STORY_HISTORY, worn: STORY_SET, onPick: fn(), onClose: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sets worn before, newest first, the one worn now marked; one kept without its picture. */
export const Sets: Story = {};

export const Empty: Story = { args: { entries: [] } };
