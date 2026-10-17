import type { Translator } from "@abth/i18n";
import { Box, IconButton, List, ListItemButton, ListItemText, Typography } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import { chartPicturePng } from "../../scripts/mock-pictures";
import { RefreshIcon } from "../read-again/read-again-foot";
import { i18nOf } from "../story-kit/env";
import { pictureOf } from "../story-kit/picture-of";
import { STORY_SONGS } from "../story-kit/songs";
import { LargeModal } from "./large-modal";
import { SearchField } from "./search-field";

interface Args {
  readonly onClose: () => void;
}

const LINES = [
  "A large modal holds a task deeper than a question: a song's details, a chart's scores, a list to pick from.",
  "On a phone it takes the whole window; on a computer it is a panel 900 pixels wide.",
  "It slides in from below, as a page does, and back down when it closes.",
];

function SearchedList({ args, i18n }: { readonly args: Args; readonly i18n: Translator }) {
  const [query, setQuery] = useState("");
  const songs = STORY_SONGS.filter((song) => song.title.includes(query.trim()));
  return (
    <LargeModal
      id="story-list"
      open
      title={i18n.t("picker.title.single")}
      head={
        <SearchField
          id="story-list-search"
          query={query}
          i18n={i18n}
          hint={i18n.t("picker.searchHint")}
          onQuery={setQuery}
        />
      }
      fills
      flush
      i18n={i18n}
      onClose={args.onClose}
    >
      <List disablePadding>
        {songs.map((song) => (
          <ListItemButton key={song.songNo}>
            <ListItemText primary={song.title} secondary={song.artists.join(", ")} />
          </ListItemButton>
        ))}
      </List>
    </LargeModal>
  );
}

const meta = {
  title: "Dialogs/LargeModal",
  tags: ["ui"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => (
    <LargeModal
      id="story-words"
      open
      title={i18nOf(globals).t("costume.history.title")}
      i18n={i18nOf(globals)}
      onClose={args.onClose}
    >
      {LINES.map((line) => (
        <Typography key={line} sx={{ mb: 2 }}>
          {line}
        </Typography>
      ))}
    </LargeModal>
  ),
  args: { onClose: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A title and what it holds; a computer has the close button, a touch screen its Back. */
export const Words: Story = {};

/** A button beside the close button, as a song's details read their chart again. */
export const WithAnAction: Story = {
  render: (args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <LargeModal
        id="story-action"
        open
        title={STORY_SONGS[0]?.title ?? ""}
        titleLang="ja"
        actions={
          <IconButton aria-label={i18n.t("details.readDensity")}>
            <RefreshIcon />
          </IconButton>
        }
        i18n={i18n}
        onClose={args.onClose}
      >
        <Typography>{LINES[0]}</Typography>
      </LargeModal>
    );
  },
};

/** A search above a list that runs to the edges, as tall as the window so it does not jump. */
export const AHeadAndAList: Story = {
  render: (args, { globals }) => <SearchedList args={args} i18n={i18nOf(globals)} />,
};

/** A picture on the whole screen: black, with only the close button over it. */
export const APicture: Story = {
  render: (args, { globals }) => {
    const i18n = i18nOf(globals);
    const picture = pictureOf(chartPicturePng(4));
    return (
      <LargeModal
        id="story-picture"
        open
        title={i18n.t("details.drawnPicture", { difficulty: i18n.t("difficulty.oni") })}
        picture
        i18n={i18n}
        onClose={args.onClose}
      >
        <Box
          component="img"
          src={picture.src}
          alt=""
          sx={{ position: "absolute", inset: 0, m: "auto", maxWidth: 1, maxHeight: 1 }}
        />
      </LargeModal>
    );
  },
};
