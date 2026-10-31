import type { Meta, StoryObj } from "@storybook/react-vite";

import { LaunchCover } from "./launch-cover";

const meta = {
  title: "Status/LaunchCover",
  tags: ["ui"],
  parameters: { layout: "fullscreen" },
  render: ({ shown }) => <LaunchCover shown={shown} />,
  args: { shown: true },
} satisfies Meta<{ readonly shown: boolean }>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The window as the app starts, and as it comes back after a long time away on Android. */
export const AsTheAppStarts: Story = {};
