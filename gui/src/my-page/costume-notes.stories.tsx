import { Stack } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { previewOf, STORY_EDITOR } from "../story-kit/costume";
import { i18nOf } from "../story-kit/env";
import { CostumeNotes } from "./costume-notes";

const DRAFT = { ...STORY_EDITOR.state, costume1: 14 };

const meta = {
  title: "Status/CostumeNotes",
  tags: ["my-page"],
  render: (_args, { globals }) => (
    <Stack spacing={1.5} sx={{ maxWidth: 480 }}>
      <CostumeNotes
        step={{
          name: "editing",
          editor: STORY_EDITOR,
          draft: DRAFT,
          notice: null,
        }}
        preview={previewOf(DRAFT, { failure: "preview=notPng status=200" })}
        i18n={i18nOf(globals)}
      />
    </Stack>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every note the Costume page can show at once: the preview and the きぐるみ. */
export const AllAtOnce: Story = {};
