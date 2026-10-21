import type { Meta, StoryObj } from "@storybook/react-vite";

import * as Icons from "../../ui/icons.stories";
import { Gallery } from "../gallery";

const meta = {
  title: "Foundations/Side by side",
  tags: ["gallery"],
  parameters: { layout: "fullscreen" },
  render: (_args, context) => (
    <Gallery
      context={context}
      members={[{ name: "Icons", meta: Icons.default, story: Icons.Icons, wide: true }]}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The foundations' members together: every icon the app draws. */
export const SideBySide: Story = { name: "Side by side" };
