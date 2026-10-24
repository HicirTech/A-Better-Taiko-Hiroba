import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { WindowCrash } from "./window-crash";

interface Args {
  readonly code: string;
  readonly onReload: () => void;
}

const meta = {
  title: "Status/WindowCrash",
  tags: ["ui"],
  parameters: { layout: "fullscreen" },
  args: { code: "window=TypeError", onReload: fn() },
  render: (args: Args, { globals }) => <WindowCrash {...args} i18n={i18nOf(globals)} />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Something outside every page threw: the frame, the navigation or the app itself. */
export const OutsideAPage: Story = {};
