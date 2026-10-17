import { Paper } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { i18nOf } from "../story-kit/env";
import { SongDataSection } from "./song-data-section";

const meta = {
  title: "Cards and sections/SongDataSection",
  tags: ["settings"],
  render: (_args, { globals }) => (
    <Paper variant="outlined" sx={{ maxWidth: 600 }}>
      <SongDataSection i18n={i18nOf(globals)} />
    </Paper>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Where the chart pictures come from, a toggle, and where each kind of song data comes from. */
export const Sources: Story = {};
