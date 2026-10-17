import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { WithNameAndTitle } from "../story-kit/editors";
import { i18nOf } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { TitleSection } from "./title-section";

const meta = {
  title: "Cards and sections/TitleSection",
  tags: ["name-title"],
  render: (_args, { globals }) => (
    <Box sx={{ maxWidth: 600 }}>
      <WithNameAndTitle>
        {(_name, title) => (
          <TitleSection
            title={title}
            worn={STORY_PROFILE.title}
            i18n={i18nOf(globals)}
            busy={false}
          />
        )}
      </WithNameAndTitle>
    </Box>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The title worn, its picker and Save on one row; a pick saves to Hiroba, with what came of it. */
export const Title: Story = {};
