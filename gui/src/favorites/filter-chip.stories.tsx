import type { Translator } from "@abth/i18n";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import {
  DIFFICULTY_COLOUR,
  DIFFICULTY_LABEL,
  DIFFICULTY_TEXT,
} from "../shared/song-catalogue/genre-look";
import { DIFFICULTIES, type Difficulty } from "../shared/song-catalogue/types";
import { i18nOf } from "../story-kit/env";
import { press } from "../story-kit/steps";
import { FilterChip, type FilterOption } from "./filter-chip";

const charts = ({ t }: Translator): readonly FilterOption<Difficulty>[] =>
  DIFFICULTIES.map((chart) => ({
    value: chart,
    label: t(DIFFICULTY_LABEL[chart]),
    fill: { colour: DIFFICULTY_COLOUR[chart], text: DIFFICULTY_TEXT },
  }));

const stars = ({ t }: Translator): readonly FilterOption<number>[] =>
  [6, 7, 8, 9, 10].map((level) => ({
    value: level,
    label: t("picker.level", { level }),
    fill: null,
  }));

interface Args {
  readonly onChoose: (value: Difficulty | number | null) => void;
}

function ChartChip({
  i18n,
  first,
  required = false,
  onChoose,
}: Args & { i18n: Translator; first: Difficulty | null; required?: boolean }) {
  const [chosen, setChosen] = useState(first);
  return (
    <FilterChip
      id="story-chart-chip"
      name={i18n.t("picker.difficulty")}
      options={charts(i18n)}
      chosen={chosen}
      i18n={i18n}
      required={required}
      onChoose={(value) => {
        setChosen(value);
        onChoose(value);
      }}
    />
  );
}

function StarsChip({ i18n, first, onChoose }: Args & { i18n: Translator; first: number | null }) {
  const [chosen, setChosen] = useState(first);
  return (
    <FilterChip
      id="story-stars-chip"
      name={i18n.t("picker.stars")}
      options={stars(i18n)}
      chosen={chosen}
      i18n={i18n}
      onChoose={(value) => {
        setChosen(value);
        onChoose(value);
      }}
    />
  );
}

const meta = {
  title: "Chips and filters/FilterChip",
  tags: ["favorites"],
  render: (args, { globals }) => <ChartChip {...args} i18n={i18nOf(globals)} first={null} />,
  args: { onChoose: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The filter's name and an arrow, until its menu makes a choice. */
export const NothingChosen: Story = {};

/** A chosen chip takes the choice's colour, and its × clears it. */
export const ChosenInItsColour: Story = {
  render: (args, { globals }) => <ChartChip {...args} i18n={i18nOf(globals)} first="oni" />,
};

/** A choice with no colour of its own takes the theme's. */
export const ChosenInTheThemeColour: Story = {
  render: (args, { globals }) => <StarsChip {...args} i18n={i18nOf(globals)} first={8} />,
};

/** A filter that always holds a choice: no "All" item and no ×. */
export const AlwaysAChoice: Story = {
  render: (args, { globals }) => (
    <ChartChip {...args} i18n={i18nOf(globals)} first="oni" required />
  ),
};

/** The menu a chip opens: "All" first, then each choice in its colour. */
export const MenuOpen: Story = {
  render: (args, { globals }) => <ChartChip {...args} i18n={i18nOf(globals)} first="oni" />,
  play: () => press("#story-chart-chip"),
};
