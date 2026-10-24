import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { action } from "storybook/actions";

import { DEFAULT_CHART_SOURCE } from "../shared/song-catalogue/chart-source";
import { i18nOf } from "../story-kit/env";
import { SongDataSection } from "./song-data-section";

const sourceAction = action("choose a chart source");

function ChartSources({ i18n }: { readonly i18n: Translator }) {
  const [source, setSource] = useState(DEFAULT_CHART_SOURCE);
  return (
    <SongDataSection
      source={source}
      i18n={i18n}
      onSource={(next) => {
        setSource(next);
        sourceAction(next);
      }}
    />
  );
}

const meta = {
  title: "Cards and sections/SongDataSection",
  tags: ["settings"],
  render: (_args, { globals }) => (
    <Box sx={{ maxWidth: 600 }}>
      <ChartSources i18n={i18nOf(globals)} />
    </Box>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Where the chart pictures come from, a toggle, and where each kind of song data comes from. */
export const Sources: Story = {};
