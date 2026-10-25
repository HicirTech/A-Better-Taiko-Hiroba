import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { modalLookOf, touchOf } from "../story-kit/devices";
import { i18nOf } from "../story-kit/env";
import { STORY_SETS } from "../story-kit/sets";
import { AddToSetDialog, type AddToSetDialogProps } from "./add-to-set-dialog";

type Args = Omit<AddToSetDialogProps, "touchFirst" | "modalLook" | "i18n">;

const meta = {
  title: "Dialogs/AddToSetDialog",
  tags: ["scores"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => (
    <AddToSetDialog
      {...args}
      touchFirst={touchOf(globals)}
      modalLook={modalLookOf(globals)}
      i18n={i18nOf(globals)}
    />
  ),
  args: {
    name: { text: "夜明けのスケッチ", lang: "ja" },
    songNo: "1001",
    sets: STORY_SETS,
    onAdd: fn(),
    onNewSet: fn(),
    onClose: fn(),
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A new set first, then each set, shut where it holds the song or is full. */
export const WhichSet: Story = {};

/** No set kept yet: only a new one. */
export const NoSetYet: Story = { args: { sets: [] } };
