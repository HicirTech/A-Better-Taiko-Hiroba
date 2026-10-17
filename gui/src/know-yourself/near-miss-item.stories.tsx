import type { Meta, StoryObj } from "@storybook/react-vite";

import { STORY_KNOWN } from "../story-kit/know";
import { knowCards } from "../story-kit/know-cards";
import { NearMissItem } from "./near-miss-item";

const meta = {
  title: "Cards and sections/NearMissItem",
  tags: ["know-yourself"],
  render: (_args, { globals }) =>
    knowCards(
      (parts) => <NearMissItem crown="fullCombo" charts={STORY_KNOWN} parts={parts} />,
      globals,
    ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The charts a few Bads short of a Full Combo. */
export const NearAFullCombo: Story = {};

/** The charts a few OKs short of a Donderful Combo. */
export const NearADonderfulCombo: Story = {
  render: (_args, { globals }) =>
    knowCards(
      (parts) => <NearMissItem crown="donderful" charts={STORY_KNOWN} parts={parts} />,
      globals,
    ),
};
