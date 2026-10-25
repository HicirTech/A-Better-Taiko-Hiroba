import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { i18nOf } from "../story-kit/env";
import { FilterToggles } from "./filter-chip";

type Gap = "never" | "notCleared";

interface Args {
  readonly first: Gap | null;
}

function GapToggles({ first, globals }: Args & { readonly globals: Record<string, unknown> }) {
  const { t } = i18nOf(globals);
  const [chosen, setChosen] = useState(first);
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      <FilterToggles<Gap>
        id="story-gaps"
        options={[
          { value: "never", label: t("know.never"), fill: null },
          { value: "notCleared", label: t("know.tried"), fill: null },
        ]}
        chosen={chosen}
        onChoose={setChosen}
      />
    </Box>
  );
}

const meta = {
  title: "Chips and filters/FilterToggles",
  tags: ["ui"],
  render: (args, { globals }) => <GapToggles {...args} globals={globals} />,
  args: { first: null },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Know yourself's narrowing of a list, nothing chosen: a click chooses, and switches back. */
export const NothingChosen: Story = {};

/** One chosen, in the theme's colour as a filter chip's choice is, with its × to clear it. */
export const OneChosen: Story = { args: { first: "never" } };
