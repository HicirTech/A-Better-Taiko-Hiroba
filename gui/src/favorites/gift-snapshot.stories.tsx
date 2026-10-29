import type { Meta, StoryObj } from "@storybook/react-vite";

import type { PictureLane } from "../pictures/picture-lane";
import type { Gift } from "../shared/gifts/gift-code";
import type { ProfileView } from "../shared/session-port";
import { DEFAULT_SHOWN } from "../shared/song-catalogue/shown-difficulty";
import { i18nOf, localeOf, type StoryGlobals } from "../story-kit/env";
import { FOLDER_SONGS } from "../story-kit/favorites";
import { STORY_PROFILE } from "../story-kit/profile";
import { lookOf } from "../story-kit/songs";
import { STORY_LANE, WAITING_LANE } from "../story-kit/story-pictures";
import { GiftSnapshot } from "./gift-snapshot";

/** Four of the folder's songs, given by the story's player. */
const GIFT: Gift = {
  songs: FOLDER_SONGS.slice(0, 4),
  giver: STORY_PROFILE.nickname,
  title: "お誕生日おめでとう！",
  madeAt: Date.UTC(2026, 9, 29, 3, 15, 30),
  shown: true,
};
/** A giver with the longest nickname Hiroba takes. */
const LONGEST_NAME: ProfileView = { ...STORY_PROFILE, nickname: "ドンだーひろばの名人" };

const snapshot = (
  gift: Gift,
  globals: StoryGlobals,
  {
    lane = STORY_LANE,
    profile = STORY_PROFILE,
  }: { lane?: PictureLane; profile?: ProfileView } = {},
) => (
  <GiftSnapshot
    gift={gift}
    profile={profile}
    look={(songNo) => lookOf(songNo, localeOf(globals))}
    shownDifficulty={DEFAULT_SHOWN}
    lane={lane}
    i18n={i18nOf(globals)}
  />
);

const meta = {
  title: "Cards and sections/GiftSnapshot",
  tags: ["favorites"],
  render: (_args, { globals }) => snapshot(GIFT, globals),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A gift as a picture to share: its giver, title and code, and the songs it holds. */
export const Shown: Story = {};

/** A mystery gift: its songs stay off the picture, only how many there are. */
export const Mystery: Story = {
  render: (_args, { globals }) => snapshot({ ...GIFT, shown: false }, globals),
};

/** The longest gift: four songs, the longest nickname and title, its code at its largest. */
export const Longest: Story = {
  render: (_args, { globals }) =>
    snapshot(
      {
        ...GIFT,
        giver: LONGEST_NAME.nickname,
        title: "お誕生日おめでとう！今年もたくさん遊ぼう",
      },
      globals,
      { profile: LONGEST_NAME },
    ),
};

/** One song and no title: the plate stands alone beside My Don. */
export const OneSongUntitled: Story = {
  render: (_args, { globals }) =>
    snapshot({ ...GIFT, songs: FOLDER_SONGS.slice(0, 1), title: "" }, globals),
};

export const PicturesOnTheirWay: Story = {
  render: (_args, { globals }) => snapshot(GIFT, globals, { lane: WAITING_LANE }),
};
