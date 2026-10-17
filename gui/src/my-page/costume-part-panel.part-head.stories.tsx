import type { Meta, StoryObj } from "@storybook/react-vite";

import { STORY_EDITOR } from "../story-kit/costume";
import { i18nOf } from "../story-kit/env";
import { STORY_LANE } from "../story-kit/story-pictures";
import { PartHead } from "./costume-part-panel";
import type { CostumePart } from "./costume-parts";

interface Args {
  readonly part: CostumePart;
}

const meta = {
  title: "Cards and sections/PartHead",
  tags: ["my-page"],
  render: ({ part }, { globals }) => (
    <PartHead view={STORY_EDITOR} lane={STORY_LANE} i18n={i18nOf(globals)} part={part} />
  ),
  args: { part: "costume2" },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The name over the part's cells. */
export const Heading: Story = {};
