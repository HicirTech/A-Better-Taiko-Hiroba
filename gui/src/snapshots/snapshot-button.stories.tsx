import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProfileSnapshot } from "../my-page/profile-snapshot";
import type { SystemShare } from "../platform";
import { i18nOf, STORY_COPY_OR_SAVE, STORY_SHEET, type StoryGlobals } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { press } from "../story-kit/steps";
import { STORY_LANE } from "../story-kit/story-pictures";
import { SnapshotButton } from "./snapshot-button";

/** The desktop's ways, which both fail as the picture is handed over. */
const FAILING: SystemShare = {
  ways: ["copy", "save"],
  hand: () => Promise.reject(new Error("story=failed")),
};

const button = (share: SystemShare, globals: StoryGlobals) => {
  const i18n = i18nOf(globals);
  return (
    <SnapshotButton
      id="story-share"
      shows="abth-profile"
      share={share}
      lane={STORY_LANE}
      i18n={i18n}
      snapshot={(lane) => <ProfileSnapshot profile={STORY_PROFILE} lane={lane} i18n={i18n} />}
    />
  );
};

const meta = {
  title: "Buttons/SnapshotButton",
  tags: ["snapshots"],
  render: (_args, { globals }) => button(STORY_COPY_OR_SAVE, globals),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The desktop's: a menu of the clipboard and a file. Save picture downloads the picture made. */
export const CopyOrSave: Story = {};

export const MenuOpen: Story = { play: () => press("#story-share") };

/** Android's: the system's share sheet, at once. */
export const ShareSheet: Story = {
  render: (_args, { globals }) => button(STORY_SHEET, globals),
};

/** A picture that could not be handed over: said at the window's foot. */
export const Failed: Story = {
  render: (_args, { globals }) => button(FAILING, globals),
  play: async () => {
    await press("#story-share");
    await press("#story-share-copy");
  },
};
