import type { Meta, StoryObj } from "@storybook/react-vite";

import { STORY_KNOWN } from "../story-kit/know";
import { knowCards } from "../story-kit/know-cards";
import { RanksItem } from "./ranks-item";

const meta = {
  title: "Cards and sections/RanksItem",
  tags: ["know-yourself"],
  render: (_args, { globals }) =>
    knowCards((parts) => <RanksItem charts={STORY_KNOWN} parts={parts} />, globals),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The score ranks by star level, and the rank half the tried charts reach. */
export const ScoreRanks: Story = {};
