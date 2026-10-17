import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";

import { FAILING_LANE, STORY_LANE, WAITING_LANE } from "../story-kit/story-pictures";
import { HirobaIcon } from "./hiroba-icon";

type Args = Omit<ComponentProps<typeof HirobaIcon>, "lane">;

const meta = {
  title: "Pictures/HirobaIcon",
  tags: ["pictures"],
  render: (args) => <HirobaIcon {...args} lane={STORY_LANE} />,
  args: { want: { kind: "rankIcon", rank: 8 }, width: 48, height: 36, label: "虹極", order: 0 },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RankIcon: Story = {};

export const CrownIcon: Story = {
  args: { want: { kind: "crownIcon", crown: "donderful" }, width: 26, height: 30, label: "全良" },
};

export const OptionIcon: Story = {
  args: { want: { kind: "optionIcon", option: "a7" }, width: 30, height: 30, label: "でたらめ" },
};

/** The space an icon keeps while it is on its way. */
export const Waiting: Story = { render: (args) => <HirobaIcon {...args} lane={WAITING_LANE} /> };

export const Failed: Story = { render: (args) => <HirobaIcon {...args} lane={FAILING_LANE} /> };
