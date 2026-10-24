import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { ProfileView } from "../shared/session-port";
import { i18nOf } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { STORY_LANE, WAITING_LANE } from "../story-kit/story-pictures";
import { MedalCard } from "./medal-card";

interface Args {
  readonly medal: ProfileView["medal"];
}

const meta = {
  title: "Pictures/MedalCard",
  tags: ["my-page"],
  render: ({ medal }, { globals }) => (
    <Box sx={{ maxWidth: 420 }}>
      <MedalCard medal={medal} lane={STORY_LANE} i18n={i18nOf(globals)} />
    </Box>
  ),
  args: { medal: STORY_PROFILE.medal },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The どんメダル plate laid out as Hiroba's: its name and the count collected. */
export const Collecting: Story = {};

export const Complete: Story = {
  args: { medal: { name: "どんメダル2026秋", progress: { kind: "complete" } } },
};

/** A plate whose words this version cannot read: its name, and a code. */
export const Unrecognised: Story = {
  args: {
    medal: {
      name: "どんメダル2026秋",
      progress: { kind: "unrecognised", reason: "noCountNoComplete" },
    },
  },
};

export const NoPlate: Story = { args: { medal: null } };

/** The pale ground that stands in while the plate is on its way. */
export const PlateOnItsWay: Story = {
  render: ({ medal }, { globals }) => (
    <Box sx={{ maxWidth: 420 }}>
      <MedalCard medal={medal} lane={WAITING_LANE} i18n={i18nOf(globals)} />
    </Box>
  ),
};
