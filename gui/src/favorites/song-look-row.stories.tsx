import { Box, IconButton } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";

import { bpmText } from "../songs/song-facts";
import { i18nOf, localeOf } from "../story-kit/env";
import { lookOf, storySong } from "../story-kit/songs";
import { CloseIcon, DragIndicatorIcon } from "../ui/icons";
import { lookOfShown } from "./song-look";
import { SongLookRow } from "./song-look-row";

interface Args {
  /** The stand-in song the row draws. */
  readonly songNo: string;
  /** The room the row has. */
  readonly widthPx: number;
  readonly scrolling: boolean;
}

const meta = {
  title: "Rows and lists/SongLookRow",
  tags: ["favorites"],
  render: ({ songNo, widthPx, scrolling }, { globals }) => (
    <Box sx={{ width: widthPx }}>
      <SongLookRow
        component="div"
        look={lookOf(songNo, localeOf(globals))}
        i18n={i18nOf(globals)}
        scrolling={scrolling}
      />
    </Box>
  ),
  args: { songNo: "1001", widthPx: 480, scrolling: false },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {};

/** A song in two genres shows a bar for each. */
export const TwoGenres: Story = { args: { songNo: "1012" } };

/** The tempo leads the second line, as the song search shows it. */
export const WithTempo: Story = {
  args: { songNo: "1005" },
  render: ({ songNo, widthPx }, { globals }) => {
    const i18n = i18nOf(globals);
    const { bpm } = storySong(songNo);
    return (
      <Box sx={{ width: widthPx }}>
        <SongLookRow
          component="div"
          look={lookOf(songNo, i18n.locale)}
          i18n={i18n}
          detail={bpm === null ? undefined : i18n.t("song.bpm", { bpm: bpmText(bpm) })}
        />
      </Box>
    );
  },
};

/** A press anywhere on the row opens the song's details; its levels' badges stay their own. */
export const OpensDetails: Story = {
  render: ({ songNo, widthPx }, { globals }) => (
    <Box sx={{ width: widthPx }}>
      <SongLookRow
        component="div"
        look={lookOf(songNo, localeOf(globals))}
        i18n={i18nOf(globals)}
        onOpen={action("open details")}
      />
    </Box>
  ),
};

/** A long name scrolls, where the row's room is short. */
export const LongNameScrolls: Story = { args: { songNo: "1009", widthPx: 300, scrolling: true } };

/** A song the song list lacks: Hiroba's own title and genre, and no levels. */
export const NotInTheSongList: Story = {
  render: ({ widthPx }, { globals }) => (
    <Box sx={{ width: widthPx }}>
      <SongLookRow
        component="div"
        look={lookOfShown({ songNo: "1999", title: "曲リストにない曲", genre: 6 })}
        i18n={i18nOf(globals)}
      />
    </Box>
  ),
};

/** As a set being edited draws it: a handle before, a button that takes it out after. */
export const WithHandleAndRemove: Story = {
  render: ({ songNo, widthPx }, { globals }) => {
    const i18n = i18nOf(globals);
    const look = lookOf(songNo, i18n.locale);
    const label = i18n.t("favorites.removeSong", { name: look.name });
    return (
      <Box sx={{ width: widthPx }}>
        <SongLookRow
          component="div"
          look={look}
          i18n={i18n}
          scrolling
          start={
            <Box
              component="span"
              sx={{ display: "flex", alignItems: "center", color: "text.secondary" }}
            >
              <DragIndicatorIcon fontSize="small" />
            </Box>
          }
          end={
            <IconButton size="small" aria-label={label} title={label} onClick={action("remove")}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        />
      </Box>
    );
  },
};
