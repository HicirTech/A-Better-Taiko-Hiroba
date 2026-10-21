import type { Translator } from "@abth/i18n";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { GENRE_LABEL } from "../favorites/genre-look";
import { nameLanguage, shownName } from "../favorites/song-names";
import { i18nOf } from "../story-kit/env";
import { STORY_SETS } from "../story-kit/sets";
import { storySong } from "../story-kit/songs";
import { AddToSetDialog, type AddToSetDialogProps, type NamedSong } from "./add-to-set-dialog";

type Args = Omit<AddToSetDialogProps, "i18n" | "candidates">;

/** A song as the dialog names it: its genres and artists tell it from one with its title. */
const namedSong = (songNo: string, i18n: Translator): NamedSong => {
  const song = storySong(songNo);
  const text = shownName(song, i18n.locale);
  return {
    songNo,
    text,
    lang: nameLanguage(song, text),
    detail: [...song.genres.map((genre) => i18n.t(GENRE_LABEL[genre])), ...song.artists].join(
      " · ",
    ),
  };
};

const meta = {
  title: "Dialogs/AddToSetDialog",
  tags: ["history"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => (
    <AddToSetDialog {...args} candidates={[]} i18n={i18nOf(globals)} />
  ),
  args: {
    name: { text: "夜明けのスケッチ", lang: "ja" },
    songNo: "1001",
    sets: STORY_SETS,
    onChooseSong: fn(),
    onAdd: fn(),
    onNewSet: fn(),
    onClose: fn(),
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Each set, shut where it holds the song or is full, and a new set. */
export const WhichSet: Story = {};

/** Two songs share the play's title: which one it was comes first. */
export const WhichSong: Story = {
  args: { name: { text: "ひだまりのうた", lang: "ja" }, songNo: null },
  render: (args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <AddToSetDialog
        {...args}
        candidates={[namedSong("1014", i18n), namedSong("1031", i18n)]}
        i18n={i18n}
      />
    );
  },
};

/** No song is known for the play's title. */
export const UnknownSong: Story = { args: { songNo: null } };
