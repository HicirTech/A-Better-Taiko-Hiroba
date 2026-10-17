import type { Meta, StoryObj } from "@storybook/react-vite";

import { onDevice } from "../story-kit/devices";
import { WithCostumeEditor } from "../story-kit/editors";
import { i18nOf } from "../story-kit/env";
import { STORY_LANE } from "../story-kit/story-pictures";
import { CostumePage } from "./costume-page";

const meta = {
  title: "Pages/Costume/NarrowBody",
  tags: ["my-page"],
  parameters: { layout: "fullscreen" },
  globals: onDevice("phone"),
  render: (_args, { globals }) => (
    <WithCostumeEditor>
      {(editor) => <CostumePage editor={editor} lane={STORY_LANE} i18n={i18nOf(globals)} />}
    </WithCostumeEditor>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Costume page in a narrow window: the preview and the tiles in one sticky block over the
 * grid, and Save in a bar at the bottom. */
export const OneColumn: Story = {};
