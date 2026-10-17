import { err } from "@abth/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { appOn } from "../story-kit/story-app";
import { neverAnswers } from "../story-kit/story-port";

const meta = {
  title: "Pages/Costume/CostumePage",
  tags: ["my-page"],
  parameters: { layout: "fullscreen" },
  render: appOn("costume"),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Costume page in the window: picks, the preview, History, Reset and Save to Hiroba. */
export const InTheWindow: Story = {};

/** The editor is on its way. */
export const Reading: Story = { render: appOn("costume", { openCostumeEditor: neverAnswers }) };

export const ReadFailed: Story = {
  render: appOn("costume", {
    openCostumeEditor: () => Promise.resolve(err({ kind: "siteError" })),
  }),
};
