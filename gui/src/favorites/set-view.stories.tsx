import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import { fn } from "storybook/test";
import { DEFAULT_SHOWN } from "../shared/song-catalogue/shown-difficulty";

import { touchOf } from "../story-kit/devices";
import { i18nOf, localeOf } from "../story-kit/env";
import { STORY_SETS } from "../story-kit/sets";
import { lookOf } from "../story-kit/songs";
import { SetView, type SetViewProps } from "./set-view";

type Args = Omit<SetViewProps, "look" | "shownDifficulty" | "i18n" | "openDetails" | "byLongPress">;

const meta = {
  title: "Cards and sections/SetView",
  tags: ["favorites"],
  render: (args, { globals }) => (
    <Box sx={{ maxWidth: 600 }}>
      <SetView
        {...args}
        look={(songNo) => lookOf(songNo, localeOf(globals))}
        shownDifficulty={DEFAULT_SHOWN}
        i18n={i18nOf(globals)}
        openDetails={() => action("open details")}
        byLongPress={touchOf(globals)}
      />
    </Box>
  ),
  args: {
    songs: STORY_SETS[0]?.songs ?? [],
    editing: false,
    edited: false,
    onEdit: fn(),
    onAddSongs: fn(),
    onRemoveSong: fn(),
    onMoveSong: fn(),
    onReset: fn(),
    onSave: fn(),
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shown: Edit; the page's sync bar sends the set to Hiroba's folder. */
export const Shown: Story = {};

/** Edit was pressed: songs can be added, moved by their handles and taken out, until Save. */
export const Editing: Story = { args: { editing: true } };

/** Edits made: Reset can drop them. */
export const Edited: Story = { args: { editing: true, edited: true } };

export const Empty: Story = { args: { songs: [] } };
