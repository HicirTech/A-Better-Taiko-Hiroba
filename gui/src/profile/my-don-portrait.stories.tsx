import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";

import type { PictureAnswer } from "../pictures/picture-lane";
import { touchOf } from "../story-kit/devices";
import { i18nOf } from "../story-kit/env";
import { storyAnswer } from "../story-kit/story-pictures";
import { MY_DON, MyDonPortrait } from "./my-don-portrait";

interface Args {
  readonly answer: PictureAnswer | undefined;
}

const meta = {
  title: "Pictures/MyDonPortrait",
  tags: ["profile"],
  render: ({ answer }, { globals }) => (
    <Box sx={{ width: 200 }}>
      <MyDonPortrait
        answer={answer}
        action={{ open: action("open the Costume page"), byLongPress: touchOf(globals) }}
        i18n={i18nOf(globals)}
        ref={null}
      />
    </Box>
  ),
  args: { answer: storyAnswer(MY_DON) },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The portrait on Hiroba's blue tile: a click opens the Costume page, a long press on a phone. */
export const Shown: Story = {};

export const OnItsWay: Story = { args: { answer: undefined } };

export const Failed: Story = { args: { answer: { failure: "myDon=notPng status=200" } } };
