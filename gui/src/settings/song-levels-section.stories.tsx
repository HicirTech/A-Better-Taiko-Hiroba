import { Paper } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { i18nOf } from "../story-kit/env";
import { SongLevelsSection } from "./song-levels-section";

const meta = {
  title: "Cards and sections/SongLevelsSection",
  tags: ["settings"],
  render: (_args, { globals }) => (
    <Paper variant="outlined" sx={{ maxWidth: 600 }}>
      <SongLevelsSection i18n={i18nOf(globals)} />
    </Paper>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The difficulty whose level songs show first. */
export const ShownFirst: Story = {};
