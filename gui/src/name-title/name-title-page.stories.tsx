import { err } from "@abth/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { appOn } from "../story-kit/story-app";

const meta = {
  title: "Pages/Nickname and title/NameTitlePage",
  tags: ["name-title"],
  parameters: { layout: "fullscreen" },
  render: appOn("nameTitle"),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The plate, the title's picker and the nickname's field, in the window. */
export const InTheWindow: Story = {};

/** The titles owned could not be read as the picker opened. */
export const TitlesFailed: Story = {
  render: appOn("nameTitle", {
    openTitleEditor: () => Promise.resolve(err({ kind: "timedOut" })),
  }),
};
