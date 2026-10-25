import type { Genre } from "@abth/core";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { GENRE_COLOUR, GENRE_LABEL } from "../shared/song-catalogue/genre-look";
import { i18nOf } from "../story-kit/env";
import { CheckIcon } from "./icons";
import { LabelChip } from "./label-chip";

const GENRES = Object.keys(GENRE_LABEL).map(Number) as Genre[];

const meta = {
  title: "Chips and filters/LabelChip",
  tags: ["ui"],
  render: (_args, { globals }) => (
    <LabelChip
      id="story-label"
      icon={<CheckIcon fontSize="small" />}
      label={i18nOf(globals).t("favorites.inUse", { name: "練習用" })}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The folder's mark of the set in use: outlined in the theme's colour. */
export const InTheThemesColour: Story = {};

/** A song's genres, each filled in Hiroba's colour for it. */
export const Genres: Story = {
  render: (_args, { globals }) => {
    const { t } = i18nOf(globals);
    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {GENRES.map((genre) => (
          <LabelChip key={genre} label={t(GENRE_LABEL[genre])} fill={GENRE_COLOUR[genre]} />
        ))}
      </Box>
    );
  },
};
