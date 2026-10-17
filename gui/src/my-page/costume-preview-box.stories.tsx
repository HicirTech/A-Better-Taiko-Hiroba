import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { previewOf } from "../story-kit/costume";
import { i18nOf } from "../story-kit/env";
import { STORY_SET } from "../story-kit/profile";
import { NO_PREVIEW, type PreviewState } from "./costume-preview";
import { CostumePreviewBox } from "./costume-preview-box";

interface Args {
  readonly preview: PreviewState;
}

const meta = {
  title: "Pictures/CostumePreviewBox",
  tags: ["my-page"],
  render: ({ preview }, { globals }) => (
    <Box sx={{ width: 240 }}>
      <CostumePreviewBox preview={preview} i18n={i18nOf(globals)} />
    </Box>
  ),
  args: { preview: previewOf(STORY_SET) },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hiroba's picture of the set picked. */
export const Shown: Story = {};

/** The latest pick's picture is on its way: the last one stays, with a spinner. */
export const NextOnItsWay: Story = { args: { preview: previewOf(STORY_SET, { loading: true }) } };

/** The latest pick's picture did not come: the last one is dimmed. */
export const NextFailed: Story = {
  args: { preview: previewOf(STORY_SET, { failure: "preview=notPng status=200" }) },
};

export const NoneYet: Story = { args: { preview: { ...NO_PREVIEW, loading: true } } };
