import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { ScrollingText } from "./scrolling-text";

interface Args {
  readonly text: string;
  /** The room the line has. */
  readonly widthPx: number;
}

const meta = {
  title: "Rows and lists/ScrollingText",
  tags: ["ui"],
  render: ({ text, widthPx }) => (
    <Box sx={{ width: widthPx, border: 1, borderColor: "divider", p: 1 }}>
      <ScrollingText lang="ja">{text}</ScrollingText>
    </Box>
  ),
  args: { text: "光の翼 ～Wings of Light～", widthPx: 320 },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fits: Story = {};

/** Too long for its room: it scrolls to its end and back, or ends in an ellipsis with less motion. */
export const TooLong: Story = {
  args: {
    text: "ラブリー☆ミラクル大作戦 ～とっても長いサブタイトルつきのサンプル曲～",
    widthPx: 220,
  },
};
