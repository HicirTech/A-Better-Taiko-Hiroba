import type { Translator } from "@abth/i18n";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { ScoreFilters } from "./score-filters";
import { type ScoreFilter, type ScoreSort, startingFilter } from "./score-order";

interface Args {
  readonly onFilter: (part: Partial<ScoreFilter>) => void;
  readonly onSort: (sort: ScoreSort | null) => void;
}

function Filters({ args, i18n }: { args: Args; i18n: Translator }) {
  const [filter, setFilter] = useState(startingFilter("oni"));
  const [sort, setSort] = useState<ScoreSort | null>(null);
  return (
    <ScoreFilters
      filter={filter}
      sort={sort}
      i18n={i18n}
      onFilter={(part) => {
        setFilter((now) => ({ ...now, ...part }));
        args.onFilter(part);
      }}
      onSort={(next) => {
        setSort(next);
        args.onSort(next);
      }}
    />
  );
}

const meta = {
  title: "Chips and filters/ScoreFilters",
  tags: ["scores"],
  render: (args, { globals }) => <Filters args={args} i18n={i18nOf(globals)} />,
  args: { onFilter: fn(), onSort: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Scores' genre, difficulty, star and sort chips, starting on Settings' difficulty. */
export const AsAVisitStarts: Story = {};
