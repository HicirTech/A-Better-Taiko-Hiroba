import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import { fn } from "storybook/test";

import { touchOf } from "../story-kit/devices";
import { i18nOf, localeOf } from "../story-kit/env";
import { STORY_SETS } from "../story-kit/sets";
import { lookOf } from "../story-kit/songs";
import { SetView, type SetViewProps } from "./set-view";

type Args = Omit<SetViewProps, "look" | "i18n" | "openDetails" | "byLongPress">;

const meta = {
  title: "Cards and sections/SetView",
  tags: ["favorites"],
  render: (args, { globals }) => (
    <Box sx={{ maxWidth: 600 }}>
      <SetView
        {...args}
        look={(songNo) => lookOf(songNo, localeOf(globals))}
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
    canApply: true,
    applying: false,
    onEdit: fn(),
    onAddSongs: fn(),
    onRemoveSong: fn(),
    onMoveSong: fn(),
    onReset: fn(),
    onSave: fn(),
    onApply: fn(),
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shown: Edit, and Apply lit while applying would change the folder. */
export const Shown: Story = {};

/** The folder already holds these songs: Apply stays unlit. */
export const AlreadyTheFolder: Story = { args: { canApply: false } };

/** Edit was pressed: songs can be added, moved by their handles and taken out, until Save. */
export const Editing: Story = { args: { editing: true } };

/** Edits made: Reset can drop them. */
export const Edited: Story = { args: { editing: true, edited: true } };

export const Applying: Story = { args: { applying: true, canApply: false } };

export const Empty: Story = { args: { songs: [] } };
