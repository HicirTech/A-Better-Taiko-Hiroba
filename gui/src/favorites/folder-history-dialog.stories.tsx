import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { DEFAULT_SHOWN } from "../shared/song-catalogue/shown-difficulty";
import { modalLookOf, touchOf } from "../story-kit/devices";
import { i18nOf, localeOf } from "../story-kit/env";
import { FOLDER_SONGS, STORY_FOLDER_HISTORY } from "../story-kit/favorites";
import { lookOf } from "../story-kit/songs";
import { press } from "../story-kit/steps";
import { FolderHistoryDialog, type FolderHistoryDialogProps } from "./folder-history-dialog";

type Args = Pick<
  FolderHistoryDialogProps,
  "open" | "entries" | "current" | "onPutBack" | "onSaveAsSet" | "onClose"
>;

const meta = {
  title: "Dialogs/FolderHistoryDialog",
  tags: ["favorites"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => (
    <FolderHistoryDialog
      {...args}
      look={(songNo) => lookOf(songNo, localeOf(globals))}
      shownDifficulty={DEFAULT_SHOWN}
      touchFirst={touchOf(globals)}
      modalLook={modalLookOf(globals)}
      i18n={i18nOf(globals)}
    />
  ),
  args: {
    open: true,
    entries: STORY_FOLDER_HISTORY,
    current: FOLDER_SONGS,
    onPutBack: fn(),
    onSaveAsSet: fn(),
    onClose: fn(),
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Folders kept, newest first, each its time, its count and first songs; the folder now marked. */
export const Folders: Story = {};

/** One opened: every song in it, and the ways to put it back or keep it as a set. */
export const Opened: Story = { play: () => press("#favorite-history-entry-2-header") };

/** The folder now opened: it cannot be put back, only kept as a set. */
export const CurrentOpened: Story = { play: () => press("#favorite-history-entry-0-header") };

export const Empty: Story = { args: { entries: [] } };
