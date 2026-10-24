import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FavoriteSongState } from "../shared/session-port";
import { toggledSongs } from "../shared/sets/favorite-sets";
import { DEFAULT_SHOWN } from "../shared/song-catalogue/shown-difficulty";
import type { SongCatalogue } from "../shared/song-catalogue/use-song-catalogue";
import { modalLookOf, touchOf } from "../story-kit/devices";
import { i18nOf, type StoryGlobals } from "../story-kit/env";
import { STORY_PICKABLE } from "../story-kit/favorites";
import { storyCatalogue } from "../story-kit/songs";
import type { PickableState } from "./pickable-songs";
import { SongPicker, type SongPickerProps } from "./song-picker";

interface Args {
  readonly onPick: (song: FavoriteSongState) => void;
  readonly onToggle: (songNo: string) => void;
  readonly onClose: () => void;
}

interface Shown {
  readonly catalogue?: SongCatalogue;
  readonly pickable?: PickableState;
}

const pickerOf = (
  args: Args,
  globals: StoryGlobals,
  choice: SongPickerProps["choice"],
  { catalogue = storyCatalogue(), pickable = STORY_PICKABLE }: Shown = {},
) => (
  <SongPicker
    open
    choice={choice}
    catalogue={catalogue}
    pickable={pickable}
    shownDifficulty={DEFAULT_SHOWN}
    touchFirst={touchOf(globals)}
    modalLook={modalLookOf(globals)}
    i18n={i18nOf(globals)}
    onClose={args.onClose}
  />
);

function ManyPicker({
  args,
  globals,
  first,
  limit,
}: {
  args: Args;
  globals: StoryGlobals;
  first: readonly string[];
  limit: number;
}) {
  const [picked, setPicked] = useState(first);
  return pickerOf(args, globals, {
    kind: "many",
    picked,
    limit,
    onToggle: (songNo) => {
      setPicked((now) => toggledSongs(now, songNo));
      args.onToggle(songNo);
    },
  });
}

const meta = {
  title: "Dialogs/SongPicker",
  tags: ["favorites"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => pickerOf(args, globals, { kind: "one", onPick: args.onPick }),
  args: { onPick: fn(), onToggle: fn(), onClose: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The 大好きな曲: one song, a tap closes it; an inner chart is a row of its own. */
export const PickOne: Story = {};

/** A set's songs: check boxes, and Done. */
export const CheckMany: Story = {
  render: (args, { globals }) => (
    <ManyPicker args={args} globals={globals} first={["1001", "1005"]} limit={30} />
  ),
};

/** At the set's limit the rest are shut, and a line says why. */
export const AtTheLimit: Story = {
  render: (args, { globals }) => (
    <ManyPicker args={args} globals={globals} first={["1001", "1002", "1004"]} limit={3} />
  ),
};

export const SongListLoading: Story = {
  render: (args, { globals }) =>
    pickerOf(
      args,
      globals,
      { kind: "one", onPick: args.onPick },
      { catalogue: storyCatalogue("loading") },
    ),
};

export const SongListFailed: Story = {
  render: (args, { globals }) =>
    pickerOf(
      args,
      globals,
      { kind: "one", onPick: args.onPick },
      { catalogue: storyCatalogue("failed") },
    ),
};

/** The songs Hiroba's own picker offers are being read, and none are kept yet. */
export const OfferedSongsReading: Story = {
  render: (args, { globals }) =>
    pickerOf(
      args,
      globals,
      { kind: "one", onPick: args.onPick },
      { pickable: { offered: null, status: { kind: "reading" } } },
    ),
};

export const OfferedSongsFailed: Story = {
  render: (args, { globals }) =>
    pickerOf(
      args,
      globals,
      { kind: "one", onPick: args.onPick },
      {
        pickable: {
          offered: null,
          status: {
            kind: "failed",
            failure: {
              kind: "unexpectedPage",
              detail: "path=/favorite_song_select.php status=200",
            },
          },
        },
      },
    ),
};
