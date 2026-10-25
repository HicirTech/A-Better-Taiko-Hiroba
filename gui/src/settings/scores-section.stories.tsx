import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { action } from "storybook/actions";

import type { SortChoice } from "../shared/scores/score-order";
import { DEFAULT_STARTING_SORT } from "../shared/scores/starting-sort";
import { i18nOf } from "../story-kit/env";
import { ScoresSection } from "./scores-section";

const sortAction = action("start on a sort");

function Sorting({ i18n }: { readonly i18n: Translator }) {
  const [sort, setSort] = useState<SortChoice>(DEFAULT_STARTING_SORT);
  return (
    <ScoresSection
      startingSort={sort}
      i18n={i18n}
      onStartingSort={(next) => {
        setSort(next);
        sortAction(next);
      }}
    />
  );
}

const meta = {
  title: "Cards and sections/ScoresSection",
  tags: ["settings"],
  render: (_args, { globals }) => (
    <Box sx={{ maxWidth: 600 }}>
      <Sorting i18n={i18nOf(globals)} />
    </Box>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** What Scores is sorted by as it opens, recent plays at first. */
export const DefaultSort: Story = {};
