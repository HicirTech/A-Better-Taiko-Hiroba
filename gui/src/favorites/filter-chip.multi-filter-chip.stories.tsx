import type { Translator } from "@abth/i18n";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import { DIFFICULTIES, type Difficulty } from "../shared/song-catalogue/types";
import { i18nOf } from "../story-kit/env";
import { press } from "../story-kit/steps";
import { MultiFilterChip } from "./filter-chip";
import { DIFFICULTY_COLOUR, DIFFICULTY_LABEL, DIFFICULTY_TEXT } from "./genre-look";

interface Args {
  readonly onChoose: (values: readonly Difficulty[]) => void;
}

function ChartsChip({
  i18n,
  first,
  onChoose,
}: Args & { i18n: Translator; first: readonly Difficulty[] }) {
  const [chosen, setChosen] = useState(first);
  return (
    <MultiFilterChip
      id="story-charts-chip"
      name={i18n.t("picker.difficulty")}
      options={DIFFICULTIES.map((chart) => ({
        value: chart,
        label: i18n.t(DIFFICULTY_LABEL[chart]),
        fill: { colour: DIFFICULTY_COLOUR[chart], text: DIFFICULTY_TEXT },
      }))}
      chosen={chosen}
      i18n={i18n}
      onChoose={(values) => {
        setChosen(values);
        onChoose(values);
      }}
    />
  );
}

const meta = {
  title: "Chips and filters/MultiFilterChip",
  tags: ["favorites"],
  render: (args, { globals }) => <ChartsChip {...args} i18n={i18nOf(globals)} first={[]} />,
  args: { onChoose: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NothingTicked: Story = {};

/** One choice ticked: the chip takes its colour. */
export const OneTicked: Story = {
  render: (args, { globals }) => <ChartsChip {...args} i18n={i18nOf(globals)} first={["ura"]} />,
};

/** Several choices have no one colour between them: the chip takes the theme's. */
export const SeveralTicked: Story = {
  render: (args, { globals }) => (
    <ChartsChip {...args} i18n={i18nOf(globals)} first={["hard", "oni", "ura"]} />
  ),
};

/** The menu of check boxes the chip opens, each in its choice's colour. */
export const MenuOpen: Story = {
  render: (args, { globals }) => (
    <ChartsChip {...args} i18n={i18nOf(globals)} first={["oni", "ura"]} />
  ),
  play: () => press("#story-charts-chip"),
};
