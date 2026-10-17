import type { Meta, StoryObj } from "@storybook/react-vite";

import { STORY_KNOWN } from "../story-kit/know";
import { knowCards } from "../story-kit/know-cards";
import { CrownsItem } from "./crowns-item";

const meta = {
  title: "Cards and sections/CrownsItem",
  tags: ["know-yourself"],
  render: (_args, { globals }) =>
    knowCards((parts) => <CrownsItem charts={STORY_KNOWN} parts={parts} />, globals),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The clear ladder: the crowns by star level, and a level's charts not cleared. */
export const ClearLadder: Story = {};
