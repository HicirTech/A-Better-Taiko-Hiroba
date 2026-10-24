import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import { fn } from "storybook/test";
import { DEFAULT_SHOWN } from "../shared/song-catalogue/shown-difficulty";

import { i18nOf, localeOf } from "../story-kit/env";
import { shownFavorites, storyFavorites } from "../story-kit/favorites";
import { lookOf } from "../story-kit/songs";
import type { ShownFavorites } from "./favorites-state";
import { SongCard, type SongCardProps } from "./song-card";

type Args = Pick<SongCardProps, "shown" | "onChange">;

const meta = {
  title: "Cards and sections/SongCard",
  tags: ["favorites"],
  render: (args, { globals }) => (
    <Box sx={{ maxWidth: 600 }}>
      <SongCard
        {...args}
        look={(songNo) => lookOf(songNo, localeOf(globals))}
        shownDifficulty={DEFAULT_SHOWN}
        i18n={i18nOf(globals)}
        openDetails={() => action("open details")}
      />
    </Box>
  ),
  args: { shown: shownFavorites(), onChange: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SongSet: Story = {};

export const NoneSet: Story = {
  args: { shown: shownFavorites({ view: storyFavorites(undefined, null) }) },
};

/** A song picked to replace it: the page's sync bar sends it. */
export const Picked: Story = {
  args: { shown: shownFavorites({ draft: { songNo: "1005", ura: true } }) },
};

const saving: ShownFavorites = shownFavorites({
  draft: { songNo: "1005", ura: false },
  shut: true,
  saving: "favoriteSong",
});

export const Saving: Story = { args: { shown: saving } };
