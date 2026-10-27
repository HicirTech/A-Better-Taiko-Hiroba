import type { RatingSystem } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { action } from "storybook/actions";

import { DEFAULT_STARTING_RATING } from "../shared/rating-data/starting-rating";
import { i18nOf } from "../story-kit/env";
import { RatingSection } from "./rating-section";

const ratingAction = action("start on a rating");

function Choosing({ i18n }: { readonly i18n: Translator }) {
  const [rating, setRating] = useState<RatingSystem>(DEFAULT_STARTING_RATING);
  return (
    <RatingSection
      startingRating={rating}
      i18n={i18n}
      onStartingRating={(next) => {
        setRating(next);
        ratingAction(next);
      }}
    />
  );
}

const meta = {
  title: "Cards and sections/RatingSection",
  tags: ["settings"],
  render: (_args, { globals }) => (
    <Box sx={{ maxWidth: 600 }}>
      <Choosing i18n={i18nOf(globals)} />
    </Box>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The rating Rating opens on, V1 at first. */
export const DefaultRating: Story = {};
