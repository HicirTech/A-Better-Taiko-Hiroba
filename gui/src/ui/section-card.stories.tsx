import type { Translator } from "@abth/i18n";
import { Box, Button, List, ListItemButton, ListItemText, Stack } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { SongRow } from "../favorites/song-row";
import { i18nOf, localeOf, type StoryGlobals } from "../story-kit/env";
import { FOLDER_SONGS } from "../story-kit/favorites";
import { lookOf } from "../story-kit/songs";
import { CARD_GAP, SectionCard } from "./section-card";
import { SectionTitle } from "./section-title";

const COLUMN = { maxWidth: 600 } as const;
const LIST = {
  listStyle: "none",
  m: 0,
  p: 0,
  display: "flex",
  flexDirection: "column",
  gap: 1,
} as const;

/** What the favourites' song card holds: its title, the song, and the button under it. */
function SongParts({ globals }: { readonly globals: StoryGlobals }) {
  const i18n = i18nOf(globals);
  return (
    <>
      <SectionTitle level={3}>{i18n.t("favorites.song.heading")}</SectionTitle>
      <Stack spacing={1.5}>
        <SongRow id="story-card-song" look={lookOf("1001", localeOf(globals))} i18n={i18n} />
        <Box>
          <Button variant="outlined">{i18n.t("favorites.song.change")}</Button>
        </Box>
      </Stack>
    </>
  );
}

/** What the favourites' folder card holds: its title with a button at its end, and its songs. */
function FolderParts({ globals }: { readonly globals: StoryGlobals }) {
  const i18n = i18nOf(globals);
  return (
    <>
      <SectionTitle
        level={3}
        end={
          <Button variant="outlined" size="small">
            {i18n.t("favorites.saveAsSet")}
          </Button>
        }
      >
        {i18n.t("favorites.folder.heading")}
      </SectionTitle>
      <Box component="ul" sx={LIST}>
        {FOLDER_SONGS.slice(0, 3).map((songNo) => (
          <li key={songNo}>
            <SongRow
              id={`story-card-folder-${songNo}`}
              look={lookOf(songNo, localeOf(globals))}
              i18n={i18n}
            />
          </li>
        ))}
      </Box>
    </>
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
      <SectionCard>
        <SongParts globals={globals} />
      </SectionCard>
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
      <SectionCard>
        <FolderParts globals={globals} />
      </SectionCard>
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

/** Cards one after another, 8 px apart. */
export const Stacked: Story = {
  render: (_args, { globals }) => (
    <Stack spacing={CARD_GAP} sx={COLUMN}>
      <SectionCard>
        <SongParts globals={globals} />
      </SectionCard>
      <SectionCard>
        <FolderParts globals={globals} />
      </SectionCard>
    </Stack>
  ),
};
