import type { Meta, StoryObj } from "@storybook/react-vite";

import { STORY_KNOWN } from "../story-kit/know";
import { knowCards } from "../story-kit/know-cards";
import { STORY_SCORES } from "../story-kit/scores";
import { CrownsOverTimeItem } from "./crowns-over-time-item";

const CHANGES = STORY_SCORES.scores.flatMap(({ changes }) => changes);

const meta = {
  title: "Cards and sections/CrownsOverTimeItem",
  tags: ["know-yourself"],
  render: (_args, { globals }) =>
    knowCards(
      (parts) => <CrownsOverTimeItem charts={STORY_KNOWN} changes={CHANGES} parts={parts} opened />,
      globals,
    ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The crowns stacked over time, the charts never played left out until asked for. */
export const CrownsOverTime: Story = {};
