import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { LONG_PRESS_MS } from "../my-page/use-long-press";
import { touchOf } from "../story-kit/devices";
import { i18nOf } from "../story-kit/env";
import { FOLDER_SONGS } from "../story-kit/favorites";
import { STORY_SETS } from "../story-kit/sets";
import { found, press, rightClick } from "../story-kit/steps";
import { touchHold } from "../story-kit/touch";
import { SetsDrawer, type SetsDrawerProps } from "./sets-drawer";

type Args = Omit<SetsDrawerProps, "i18n" | "byLongPress">;

const meta = {
  title: "Navigation/SetsDrawer",
  tags: ["favorites"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => (
    <SetsDrawer {...args} i18n={i18nOf(globals)} byLongPress={touchOf(globals)} />
  ),
  args: {
    open: true,
    sets: STORY_SETS,
    folderSongs: FOLDER_SONGS,
    selectedId: null,
    onPick: fn(),
    onAdd: fn(),
    onMove: fn(),
    onRename: fn(),
    onDelete: fn(),
    onClose: fn(),
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The current favourites; a set's menu is a right-click on a PC, a long press on Android. */
export const CurrentFavourites: Story = {};

export const ASetShown: Story = { args: { selectedId: STORY_SETS[0]?.id ?? null } };

/** The folder holds a set's songs: a tick marks that set. */
export const ASetIsTheFolder: Story = { args: { folderSongs: STORY_SETS[0]?.songs ?? [] } };

const FIRST_SET = "#favorites-item-set-0";

/** A set's own actions: a right-click menu on a PC, a dialog from a long press on Android. */
export const ASetsActions: Story = {
  play: async ({ globals }) => {
    if (touchOf(globals)) {
      await touchHold(await found(FIRST_SET), 2 * LONG_PRESS_MS);
    } else {
      await rightClick(FIRST_SET);
    }
  },
};

/** Delete asks first. */
export const DeletingASet: Story = {
  play: async ({ globals }) => {
    if (touchOf(globals)) {
      await touchHold(await found(FIRST_SET), 2 * LONG_PRESS_MS);
      await press("#favorite-set-actions-delete");
    } else {
      await rightClick(FIRST_SET);
      await press("#favorite-set-menu-delete");
    }
  },
};
