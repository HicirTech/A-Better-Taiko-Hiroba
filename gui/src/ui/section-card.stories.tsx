import type { Translator } from "@abth/i18n";
import { Box, Button, List, ListItemButton, ListItemText, Stack } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DEFAULT_SHOWN } from "../shared/song-catalogue/shown-difficulty";

import { SongLookRow } from "../songs/song-look-row";
import { i18nOf, localeOf, type StoryGlobals } from "../story-kit/env";
import { FOLDER_SONGS } from "../story-kit/favorites";
import { lookOf } from "../story-kit/songs";
import { CARD_GAP, CARD_ROWS, SectionCard, TO_THE_CARD_SIDES } from "./section-card";

const COLUMN = { maxWidth: 600 } as const;

/** A card as the favourites' song card: its title, the song, and the button under it. */
function LikeTheSongCard({ globals }: { readonly globals: StoryGlobals }) {
  const i18n = i18nOf(globals);
  return (
    <SectionCard heading={{ level: 3, children: i18n.t("favorites.song.heading") }}>
      <Stack spacing={1.5} useFlexGap>
        <Box sx={TO_THE_CARD_SIDES}>
          <SongLookRow
            id="story-card-song"
            component="div"
            look={lookOf("1001", localeOf(globals))}
            shownDifficulty={DEFAULT_SHOWN}
            i18n={i18n}
          />
        </Box>
        <Box>
          <Button variant="outlined">{i18n.t("favorites.song.change")}</Button>
        </Box>
      </Stack>
    </SectionCard>
  );
}

/** A card as the favourites' folder card: its title with a button at its end, and its songs. */
function LikeTheFolderCard({ globals }: { readonly globals: StoryGlobals }) {
  const i18n = i18nOf(globals);
  const end = (
    <Button variant="outlined" size="small">
      {i18n.t("favorites.saveToSet")}
    </Button>
  );
  return (
    <SectionCard heading={{ level: 3, end, children: i18n.t("favorites.folder.heading") }}>
      <Box component="ul" sx={CARD_ROWS}>
        {FOLDER_SONGS.slice(0, 3).map((songNo) => (
          <SongLookRow
            key={songNo}
            id={`story-card-folder-${songNo}`}
            look={lookOf(songNo, localeOf(globals))}
            shownDifficulty={DEFAULT_SHOWN}
            i18n={i18n}
          />
        ))}
      </Box>
    </SectionCard>
  );
}

const rowsOf = (i18n: Translator) =>
  [i18n.t("favorites.song.heading"), i18n.t("favorites.folder.heading")].map((name) => (
    <ListItemButton key={name}>
      <ListItemText primary={name} />
    </ListItemButton>
  ));

const meta = {
  title: "Cards and sections/SectionCard",
  tags: ["ui"],
  render: (_args, { globals }) => (
    <Box sx={COLUMN}>
      <LikeTheSongCard globals={globals} />
    </Box>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A card with its title over what it holds, 8 px inside, in the theme's 4 px corners. */
export const Titled: Story = {};

/** A title with what belongs beside it at the row's end, over a list. */
export const WithThingsAtItsEnd: Story = {
  render: (_args, { globals }) => (
    <Box sx={COLUMN}>
      <LikeTheFolderCard globals={globals} />
    </Box>
  ),
};

/** Rows that reach the card's edges and keep their own room, as the song search's results. */
export const FlushList: Story = {
  render: (_args, { globals }) => (
    <Box sx={COLUMN}>
      <SectionCard flush>
        <List disablePadding>{rowsOf(i18nOf(globals))}</List>
      </SectionCard>
    </Box>
  ),
};

/** Rows that reach the card's edges under a title that keeps the card's room, as in Settings. */
export const FlushListUnderItsTitle: Story = {
  render: (_args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Box sx={COLUMN}>
        <SectionCard flush heading={{ children: i18n.t("nav.favorites") }}>
          <List disablePadding>{rowsOf(i18n)}</List>
        </SectionCard>
      </Box>
    );
  },
};

/** Cards one after another, 8 px apart. */
export const Stacked: Story = {
  render: (_args, { globals }) => (
    <Stack spacing={CARD_GAP} sx={COLUMN}>
      <LikeTheSongCard globals={globals} />
      <LikeTheFolderCard globals={globals} />
    </Stack>
  ),
};
