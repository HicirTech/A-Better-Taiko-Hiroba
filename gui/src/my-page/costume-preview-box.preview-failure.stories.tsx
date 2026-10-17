import type { Meta, StoryObj } from "@storybook/react-vite";

import { previewOf } from "../story-kit/costume";
import { i18nOf } from "../story-kit/env";
import { STORY_SET } from "../story-kit/profile";
import { PreviewFailure } from "./costume-preview-box";

const meta = {
  title: "Status/PreviewFailure",
  tags: ["my-page"],
  render: (_args, { globals }) => (
    <PreviewFailure
      preview={previewOf(STORY_SET, { failure: "preview=notPng status=200 type=text/html" })}
      i18n={i18nOf(globals)}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The words for a preview that did not come, with the code to report. */
export const Failed: Story = {};
