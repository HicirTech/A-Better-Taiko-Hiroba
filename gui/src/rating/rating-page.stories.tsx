import { err } from "@abth/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { appOn } from "../story-kit/story-app";
import { neverAnswers } from "../story-kit/story-port";

const meta = {
  title: "Pages/Rating/RatingPage",
  tags: ["rating"],
  parameters: { layout: "fullscreen" },
  render: appOn("rating"),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The rating and its skills from the kept scores, and the charts that count and come next. */
export const InTheWindow: Story = {};

/** The rating system's data is on its way. */
export const DataReading: Story = { render: appOn("rating", { readRatingData: neverAnswers }) };

export const DataFailed: Story = {
  render: appOn("rating", { readRatingData: () => Promise.resolve(err({ code: "unreachable" })) }),
};
