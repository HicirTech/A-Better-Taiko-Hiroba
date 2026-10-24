import type { Meta, StoryObj } from "@storybook/react-vite";
import { modalLookOf, onDevice, touchOf, wideOf } from "../story-kit/devices";
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
      {(editor) => (
        <CostumePage
          editor={editor}
          lane={STORY_LANE}
          touchFirst={touchOf(globals)}
          wide={wideOf(globals)}
          modalLook={modalLookOf(globals)}
          i18n={i18nOf(globals)}
        />
      )}
    </WithCostumeEditor>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A wide window: the preview and tiles at the left, the part's grid at the right, the bar under. */
export const TwoColumns: Story = {};
