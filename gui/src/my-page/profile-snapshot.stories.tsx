import type { Meta, StoryObj } from "@storybook/react-vite";

import type { PictureLane } from "../pictures/picture-lane";
import { i18nOf, type StoryGlobals } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { STORY_LANE, WAITING_LANE } from "../story-kit/story-pictures";
import { ProfileSnapshot } from "./profile-snapshot";

const snapshot = (lane: PictureLane, globals: StoryGlobals) => (
  <ProfileSnapshot profile={STORY_PROFILE} lane={lane} i18n={i18nOf(globals)} />
);

const meta = {
  title: "Cards and sections/ProfileSnapshot",
  tags: ["my-page"],
  render: (_args, { globals }) => snapshot(STORY_LANE, globals),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Overview as a picture to share, the same in every theme, mode and window. */
export const Shown: Story = {};

export const PicturesOnTheirWay: Story = {
  render: (_args, { globals }) => snapshot(WAITING_LANE, globals),
};
