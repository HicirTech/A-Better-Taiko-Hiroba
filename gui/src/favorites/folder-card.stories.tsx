import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import { fn } from "storybook/test";
import { DEFAULT_SHOWN } from "../shared/song-catalogue/shown-difficulty";

import { i18nOf, localeOf } from "../story-kit/env";
import { FOLDER_SONGS, shownFavorites, storyFavorites } from "../story-kit/favorites";
import { STORY_SETS } from "../story-kit/sets";
import { lookOf } from "../story-kit/songs";
import { press } from "../story-kit/steps";
import { FolderCard, type FolderCardProps } from "./folder-card";

type Args = Pick<FolderCardProps, "shown" | "sets" | "inUse" | "onSaveAsSet" | "onSaveToSet">;

const meta = {
  title: "Cards and sections/FolderCard",
  tags: ["favorites"],
  render: (args, { globals }) => (
    <Box sx={{ maxWidth: 600 }}>
      <FolderCard
        {...args}
        look={(songNo) => lookOf(songNo, localeOf(globals))}
        shownDifficulty={DEFAULT_SHOWN}
        i18n={i18nOf(globals)}
        openDetails={() => action("open details")}
      />
    </Box>
  ),
  args: {
    shown: shownFavorites(),
    sets: STORY_SETS,
    inUse: null,
    onSaveAsSet: fn(),
    onSaveToSet: fn(),
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The folder is no set kept here: it can be saved as a new one, or into one. */
export const NotASet: Story = {};

/** The folder holds a kept set's songs: the set's name shows instead. */
export const ASetInUse: Story = {
  args: { inUse: { id: "story-folder-set", name: "練習用", songs: FOLDER_SONGS } },
};

export const Empty: Story = { args: { shown: shownFavorites({ view: storyFavorites([]) }) } };

export const Saving: Story = { args: { shown: shownFavorites({ shut: true, saving: "folder" }) } };

/** Save to a set: the sets kept, in a menu under the button. */
export const SaveToASetMenu: Story = { play: () => press("#favorite-folder-save-to-set") };

/** Saving the folder into a set asks before it replaces the set's songs. */
export const ReplacingASet: Story = {
  play: async () => {
    await press("#favorite-folder-save-to-set");
    await press("#favorite-folder-save-to-set-0");
  },
};
