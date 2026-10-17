import type { Meta, StoryObj } from "@storybook/react-vite";

import { onDevice } from "../story-kit/devices";
import { WithCostumeEditor } from "../story-kit/editors";
import { i18nOf } from "../story-kit/env";
import { STORY_LANE } from "../story-kit/story-pictures";
import { CostumePage } from "./costume-page";

const meta = {
  title: "Pages/Costume/WideBody",
  tags: ["my-page"],
  globals: onDevice("pc"),
  render: (_args, { globals }) => (
    <WithCostumeEditor>
      {(editor) => <CostumePage editor={editor} lane={STORY_LANE} i18n={i18nOf(globals)} />}
    </WithCostumeEditor>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Costume page in a wide window, which lays it out in two columns: the preview, the part
 * tiles and Save stay at the left while the grid of the part on show fills the right. */
export const TwoColumns: Story = {};
