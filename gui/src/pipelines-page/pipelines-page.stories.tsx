import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { i18nOf } from "../story-kit/env";
import { createStoryPort } from "../story-kit/story-port";
import { PipelinesPage } from "./pipelines-page";

/** The page on a story port that lasts as long as the story. */
function OnStoryPort({ globals }: { globals: Parameters<typeof i18nOf>[0] }) {
  const [port] = useState(() => createStoryPort());
  return (
    <Box sx={{ maxWidth: 720 }}>
      <PipelinesPage port={port} i18n={i18nOf(globals)} />
    </Box>
  );
}

const meta = {
  title: "Pages/Pipelines/PipelinesPage",
  tags: ["pipelines-page"],
  render: (_args, { globals }) => <OnStoryPort globals={globals} />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** What each pipeline runs and has waiting now, and the groups that ended: one past the menu. */
export const Pipelines: Story = {};
