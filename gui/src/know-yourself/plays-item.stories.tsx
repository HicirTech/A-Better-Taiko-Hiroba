import { chartKey } from "@abth/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { STORY_KNOWN } from "../story-kit/know";
import { knowCards } from "../story-kit/know-cards";
import { STORY_SCORES } from "../story-kit/scores";
import { PlaysItem } from "./plays-item";

const SCORE_OF = new Map(STORY_SCORES.scores.map((score) => [chartKey(score), score]));
const CHANGES = STORY_SCORES.scores.flatMap(({ changes }) => changes);

const meta = {
  title: "Cards and sections/PlaysItem",
  tags: ["know-yourself"],
  render: (_args, { globals }) =>
    knowCards(
      (parts) => (
        <PlaysItem charts={STORY_KNOWN} scoreOf={SCORE_OF} changes={CHANGES} parts={parts} opened />
      ),
      globals,
    ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The total plays over time, a point chosen telling its date and count. */
export const PlaysOverTime: Story = {};

/** Nothing has changed yet: the next read draws the line. */
export const OneRead: Story = {
  render: (_args, { globals }) =>
    knowCards(
      (parts) => (
        <PlaysItem charts={STORY_KNOWN} scoreOf={SCORE_OF} changes={[]} parts={parts} opened />
      ),
      globals,
    ),
};
