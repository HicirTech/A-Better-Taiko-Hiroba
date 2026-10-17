import type { Meta, StoryObj } from "@storybook/react-vite";

import { STORY_KNOWN } from "../story-kit/know";
import { knowCards } from "../story-kit/know-cards";
import { BandItem } from "./band-item";

const meta = {
  title: "Cards and sections/BandItem",
  tags: ["know-yourself"],
  render: (_args, { globals }) =>
    knowCards((parts) => <BandItem view="perSecond" charts={STORY_KNOWN} parts={parts} />, globals),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The crowns by hits per second, and the band where the top scores are most common. */
export const HitsPerSecond: Story = {};

/** The same by tempo; a range is a row of its own. */
export const Tempo: Story = {
  render: (_args, { globals }) =>
    knowCards((parts) => <BandItem view="bpm" charts={STORY_KNOWN} parts={parts} />, globals),
};
