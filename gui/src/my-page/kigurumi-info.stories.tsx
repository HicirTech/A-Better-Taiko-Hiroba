import type { Meta, StoryObj } from "@storybook/react-vite";

import { STORY_EDITOR } from "../story-kit/costume";
import { i18nOf } from "../story-kit/env";
import { KigurumiInfo } from "./kigurumi-info";

const meta = {
  title: "Status/KigurumiInfo",
  tags: ["my-page"],
  render: (_args, { globals }) => (
    <KigurumiInfo
      editor={STORY_EDITOR}
      draft={{ ...STORY_EDITOR.state, costume1: 14 }}
      i18n={i18nOf(globals)}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A きぐるみ picked over other parts: a note that it covers them. */
export const KigurumiOverParts: Story = {};
