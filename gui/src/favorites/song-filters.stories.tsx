import type { Translator } from "@abth/i18n";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { NO_FILTER, type SongFilter } from "./song-filter";
import { SongFilters } from "./song-filters";

interface Args {
  readonly onFilter: (part: Partial<SongFilter>) => void;
}

function Filters({ i18n, first, onFilter }: Args & { i18n: Translator; first: SongFilter }) {
  const [filter, setFilter] = useState(first);
  return (
    <SongFilters
      filter={filter}
      i18n={i18n}
      onFilter={(part) => {
        setFilter((now) => ({ ...now, ...part }));
        onFilter(part);
      }}
    />
  );
}

const meta = {
  title: "Chips and filters/SongFilters",
  tags: ["favorites"],
  render: (args, { globals }) => <Filters {...args} i18n={i18nOf(globals)} first={NO_FILTER} />,
  args: { onFilter: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoFilter: Story = {};

/** Genre, chart and stars all chosen: each chip in its choice's colour. */
export const AllChosen: Story = {
  render: (args, { globals }) => (
    <Filters {...args} i18n={i18nOf(globals)} first={{ genre: 2, difficulty: "oni", level: 8 }} />
  ),
};
