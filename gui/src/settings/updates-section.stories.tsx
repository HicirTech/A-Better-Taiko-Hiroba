import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { UpdatesSection, type UpdatesSectionProps } from "./updates-section";

type Args = Omit<UpdatesSectionProps, "i18n">;

const meta = {
  title: "Cards and sections/UpdatesSection",
  tags: ["settings"],
  render: (args, { globals }) => (
    <Box sx={{ maxWidth: 600 }}>
      <UpdatesSection {...args} i18n={i18nOf(globals)} />
    </Box>
  ),
  args: { version: "0.5.1", check: "idle", onCheck: fn(), onOpenReleases: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Checking: Story = { args: { check: "checking" } };

export const UpToDate: Story = { args: { check: "upToDate" } };

/** The check failed: the releases page is offered beside it. */
export const Failed: Story = { args: { check: "failed" } };
