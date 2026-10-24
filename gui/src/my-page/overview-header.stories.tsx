import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";

import type { PictureLane } from "../pictures/picture-lane";
import type { ProfileView } from "../shared/session-port";
import { touchOf } from "../story-kit/devices";
import { i18nOf, type StoryGlobals } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { FAILING_LANE, STORY_LANE, WAITING_LANE } from "../story-kit/story-pictures";
import { OverviewHeader } from "./overview-header";

interface Args {
  readonly profile: ProfileView;
}

const header = (profile: ProfileView, lane: PictureLane, globals: StoryGlobals) => {
  const byLongPress = touchOf(globals);
  return (
    <OverviewHeader
      profile={profile}
      lane={lane}
      i18n={i18nOf(globals)}
      portrait={{ open: action("open the Costume page"), byLongPress }}
      namePlate={{ open: action("open Nickname and title"), byLongPress }}
    />
  );
};

const meta = {
  title: "Cards and sections/OverviewHeader",
  tags: ["my-page"],
  render: ({ profile }, { globals }) => header(profile, STORY_LANE, globals),
  args: { profile: STORY_PROFILE },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The portrait, title plate and score panel: side by side on a PC, stacked on a phone. */
export const Shown: Story = {};

export const PicturesOnTheirWay: Story = {
  render: ({ profile }, { globals }) => header(profile, WAITING_LANE, globals),
};

/** Pictures that did not come: their stand-ins, and no words about them. */
export const PicturesFailed: Story = {
  render: ({ profile }, { globals }) => header(profile, FAILING_LANE, globals),
};

/** A dan that could not be read: the read failure's notice under the head, with its code. */
export const UnreadableDan: Story = {
  args: {
    profile: {
      ...STORY_PROFILE,
      dan: {
        unreadable: true,
        code: "dan=notPng status=200 type=image/gif bytes=43",
        picture: null,
      },
    },
  },
};

/** A player with no title, no dan and a long name. */
export const Bare: Story = {
  args: {
    profile: { ...STORY_PROFILE, title: "", dan: null, nickname: "ながいなまえのどんちゃん" },
  },
};
