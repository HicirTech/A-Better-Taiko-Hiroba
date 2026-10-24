import type { Translator } from "@abth/i18n";
import { Box, Paper } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { moved } from "../shared/sets/favorite-sets";
import { touchOf } from "../story-kit/devices";
import { i18nOf } from "../story-kit/env";
import { STORY_SETS } from "../story-kit/sets";
import { type SortableItem, SortableList } from "./sortable-list";

interface Args {
  readonly onMove: (from: number, to: number) => void;
  readonly onHold: (key: string) => void;
}

function SortableSets({
  i18n,
  byLongPress,
  onMove,
  onHold,
}: Args & { i18n: Translator; byLongPress: boolean }) {
  const [items, setItems] = useState<readonly SortableItem[]>(
    STORY_SETS.map((set) => ({ key: set.id, name: set.name })),
  );
  return (
    <SortableList
      id="story-sortable"
      items={items}
      byLongPress={byLongPress}
      i18n={i18n}
      onMove={(from, to) => {
        setItems((now) => moved(now, from, to));
        onMove(from, to);
      }}
      onHold={onHold}
      renderItem={(key, handle) => (
        <Paper variant="outlined" sx={{ display: "flex", alignItems: "center", gap: 1, p: 1 }}>
          {handle}
          <Box component="span" sx={{ minWidth: 0 }}>
            {items.find((item) => item.key === key)?.name}
          </Box>
        </Paper>
      )}
    />
  );
}

const meta = {
  title: "Rows and lists/SortableList",
  tags: ["favorites"],
  render: (args, { globals }) => (
    <Box sx={{ maxWidth: 420 }}>
      <SortableSets {...args} i18n={i18nOf(globals)} byLongPress={touchOf(globals)} />
    </Box>
  ),
  args: { onMove: fn(), onHold: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A handle on a PC; on an Android device a long press anywhere on a row picks it up. */
export const Sets: Story = {};
