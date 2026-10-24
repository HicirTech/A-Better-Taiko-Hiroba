import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { action } from "storybook/actions";

import { DEFAULT_SHOWN } from "../shared/song-catalogue/shown-difficulty";
import { i18nOf } from "../story-kit/env";
import { SongLevelsSection } from "./song-levels-section";

const shownAction = action("show a difficulty");

function Levels({ i18n }: { readonly i18n: Translator }) {
  const [shown, setShown] = useState(DEFAULT_SHOWN);
  return (
    <SongLevelsSection
      shown={shown}
      i18n={i18n}
      onShown={(next) => {
        setShown(next);
        shownAction(next);
      }}
    />
  );
}

const meta = {
  title: "Cards and sections/SongLevelsSection",
  tags: ["settings"],
  render: (_args, { globals }) => (
    <Box sx={{ maxWidth: 600 }}>
      <Levels i18n={i18nOf(globals)} />
    </Box>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The difficulty whose level songs show first. */
export const ShownFirst: Story = {};
