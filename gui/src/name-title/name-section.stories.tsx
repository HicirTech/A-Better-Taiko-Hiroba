import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { ProfileView } from "../session-port";
import { WithNameAndTitle } from "../story-kit/editors";
import { i18nOf } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { NameSection } from "./name-section";

interface Args {
  readonly rename: ProfileView["rename"];
}

const meta = {
  title: "Cards and sections/NameSection",
  tags: ["name-title"],
  render: ({ rename }, { globals }) => (
    <Box sx={{ maxWidth: 600 }}>
      <WithNameAndTitle>
        {(name) => (
          <NameSection
            name={name}
            profile={{ ...STORY_PROFILE, rename }}
            i18n={i18nOf(globals)}
            busy={false}
          />
        )}
      </WithNameAndTitle>
    </Box>
  ),
  args: { rename: "open" },
  argTypes: { rename: { control: "inline-radio", options: ["open", "closed", "unknown"] } },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The nickname field, its counter and Save, with Hiroba's notice under it. */
export const Nickname: Story = {};

/** Hiroba does not let the name change now: the field is shut, and says why. */
export const RenameClosed: Story = { args: { rename: "closed" } };
