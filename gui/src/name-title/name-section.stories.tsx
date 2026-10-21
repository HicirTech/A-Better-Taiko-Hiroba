import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import type { ProfileView } from "../session-port";
import { WithNameAndTitle } from "../story-kit/editors";
import { i18nOf } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { NameSection, type NameSectionProps } from "./name-section";

interface Args {
  readonly rename: ProfileView["rename"];
}

function Composing(props: Omit<NameSectionProps, "composing" | "onComposing">) {
  const [composing, setComposing] = useState(false);
  return <NameSection {...props} composing={composing} onComposing={setComposing} />;
}

const meta = {
  title: "Cards and sections/NameSection",
  tags: ["name-title"],
  render: ({ rename }, { globals }) => (
    <Box sx={{ maxWidth: 600 }}>
      <WithNameAndTitle>
        {(name) => (
          <Composing
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

/** The nickname field and its counter, with Hiroba's notice under it; the page's bar sends it. */
export const Nickname: Story = {};

/** Hiroba does not let the name change now: the field is shut, and says why. */
export const RenameClosed: Story = { args: { rename: "closed" } };
