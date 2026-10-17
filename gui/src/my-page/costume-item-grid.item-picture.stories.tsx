import { Box, Typography } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { PictureAnswer } from "../pictures/picture-lane";
import { storyAnswer } from "../story-kit/story-pictures";
import { ItemPicture } from "./costume-item-grid";

const ITEM = 21;

interface Args {
  readonly answer: PictureAnswer | undefined;
}

const meta = {
  title: "Pictures/ItemPicture",
  tags: ["my-page"],
  render: ({ answer }) => (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 64,
        height: 64,
        bgcolor: "#fff",
      }}
    >
      <ItemPicture
        answer={answer}
        size={56}
        fallback={
          <Typography variant="caption" sx={{ position: "relative", color: "#333", lineHeight: 1 }}>
            {ITEM}
          </Typography>
        }
      />
    </Box>
  ),
  args: { answer: storyAnswer({ kind: "costumeItem", slot: 2, id: ITEM }) },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An item's thumbnail on the white ground Hiroba drew it for, as a grid cell shows it. */
export const Shown: Story = {};

/** A skeleton while it is on its way. */
export const OnItsWay: Story = { args: { answer: undefined } };

/** The item's number where its thumbnail did not come. */
export const Failed: Story = { args: { answer: { failure: "costumeItem=notPng status=200" } } };
