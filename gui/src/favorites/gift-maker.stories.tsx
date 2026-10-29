import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import type { Gift } from "../shared/gifts/gift-code";
import { DEFAULT_SHOWN } from "../shared/song-catalogue/shown-difficulty";
import { touchOf } from "../story-kit/devices";
import { i18nOf, localeOf } from "../story-kit/env";
import { FOLDER_SONGS } from "../story-kit/favorites";
import { STORY_PROFILE } from "../story-kit/profile";
import { lookOf } from "../story-kit/songs";
import { STORY_LANE } from "../story-kit/story-pictures";
import { GiftMaker, type GiftMakerProps } from "./gift-maker";

type Args = Pick<
  GiftMakerProps,
  "gift" | "onAddSongs" | "onRemoveSong" | "onMoveSong" | "onTitle" | "onShown"
>;

const GIFT: Gift = {
  songs: FOLDER_SONGS.slice(0, 3),
  giver: STORY_PROFILE.nickname,
  title: "お誕生日おめでとう！",
  madeAt: Date.UTC(2026, 9, 29, 3, 15, 30),
  shown: true,
};

const meta = {
  title: "Cards and sections/GiftMaker",
  tags: ["favorites"],
  render: (args, { globals }) => (
    <GiftMaker
      {...args}
      profile={STORY_PROFILE}
      look={(songNo) => lookOf(songNo, localeOf(globals))}
      shownDifficulty={DEFAULT_SHOWN}
      lane={STORY_LANE}
      byLongPress={touchOf(globals)}
      i18n={i18nOf(globals)}
    />
  ),
  args: {
    gift: GIFT,
    onAddSongs: fn(),
    onRemoveSong: fn(),
    onMoveSong: fn(),
    onTitle: fn(),
    onShown: fn(),
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A gift being made: its title, its songs and whether they show, and the picture it makes. */
export const ThreeSongs: Story = {};

export const Mystery: Story = { args: { gift: { ...GIFT, shown: false } } };

/** Just opened: no songs yet, so there is nothing to share. */
export const NoSongsYet: Story = { args: { gift: { ...GIFT, songs: [], title: "" } } };
