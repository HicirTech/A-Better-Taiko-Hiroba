import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";

import type { PictureAnswer } from "../pictures/picture-lane";
import type { ProfileView } from "../session-port";
import { touchOf } from "../story-kit/devices";
import { i18nOf } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { storyAnswer } from "../story-kit/story-pictures";
import { TitlePlate } from "./title-plate";

interface Args {
  readonly profile: ProfileView;
  readonly answer: PictureAnswer | undefined;
  /** A button that opens the Nickname and title page, as on the Overview. */
  readonly opens: boolean;
}

const meta = {
  title: "Pictures/TitlePlate",
  tags: ["my-page"],
  render: ({ profile, answer, opens }, { globals }) => (
    <Box sx={{ width: 420 }}>
      <TitlePlate
        profile={profile}
        answer={answer}
        i18n={i18nOf(globals)}
        ref={null}
        {...(opens
          ? { action: { open: action("open Nickname and title"), byLongPress: touchOf(globals) } }
          : {})}
      />
    </Box>
  ),
  args: { profile: STORY_PROFILE, answer: storyAnswer({ kind: "titlePlate" }), opens: true },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The plate with the name and the dan label over its band, as Hiroba lays them out. */
export const Shown: Story = {};

/** Only a picture, as the Nickname and title page shows it. */
export const NotAButton: Story = { args: { opens: false } };

/** Stand-in boxes keep the layout while the plate is on its way. */
export const OnItsWay: Story = { args: { answer: undefined } };

export const Failed: Story = { args: { answer: { failure: "titlePlate=notPng status=200" } } };

export const NoDan: Story = { args: { profile: { ...STORY_PROFILE, dan: null } } };

/** A dan label this version cannot read: the codes to report. */
export const UnreadableDan: Story = {
  args: {
    profile: {
      ...STORY_PROFILE,
      dan: { unreadable: true, code: "label=unmatched best=7 score=0.61", picture: null },
    },
  },
};
