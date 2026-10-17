import { Paper } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { GitHubSection } from "./github-section";

interface Args {
  readonly onOpen: () => void;
}

const meta = {
  title: "Cards and sections/GitHubSection",
  tags: ["settings"],
  render: (args, { globals }) => (
    <Paper variant="outlined" sx={{ maxWidth: 600 }}>
      <GitHubSection {...args} i18n={i18nOf(globals)} />
    </Paper>
  ),
  args: { onOpen: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The project's repository, opened in the system's browser. */
export const Repository: Story = {};
