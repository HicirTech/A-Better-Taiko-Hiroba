import type { Meta, StoryObj } from "@storybook/react-vite";

import { STORY_KNOWN } from "../story-kit/know";
import { knowCards } from "../story-kit/know-cards";
import { STORY_SCORES } from "../story-kit/scores";
import { RanksOverTimeItem } from "./ranks-over-time-item";

const CHANGES = STORY_SCORES.scores.flatMap(({ changes }) => changes);

const meta = {
  title: "Cards and sections/RanksOverTimeItem",
  tags: ["know-yourself"],
  render: (_args, { globals }) =>
    knowCards(
      (parts) => <RanksOverTimeItem charts={STORY_KNOWN} changes={CHANGES} parts={parts} opened />,
      globals,
    ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Each score rank's share of the charts played, over time. */
export const RanksOverTime: Story = {};
