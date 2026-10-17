import type { Locale, Translator } from "@abth/i18n";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import { i18nOf, localeOf } from "../story-kit/env";
import { LanguageSetting } from "./language-setting";

interface Args {
  readonly onPick: (next: Locale | null) => void;
}

function Choices({
  args,
  i18n,
  system,
  first,
}: {
  args: Args;
  i18n: Translator;
  system: Locale;
  first: Locale | null;
}) {
  const [picked, setPicked] = useState(first);
  return (
    <LanguageSetting
      picked={picked}
      system={system}
      i18n={i18n}
      onPick={(next) => {
        setPicked(next);
        args.onPick(next);
      }}
    />
  );
}

const meta = {
  title: "Fields/LanguageSetting",
  tags: ["language"],
  render: (args, { globals }) => (
    <Choices args={args} i18n={i18nOf(globals)} system={localeOf(globals)} first={null} />
  ),
  args: { onPick: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Settings' language section, following the system's language. */
export const AsTheSystem: Story = {};

export const Picked: Story = {
  render: (args, { globals }) => (
    <Choices args={args} i18n={i18nOf(globals)} system={localeOf(globals)} first="ja" />
  ),
};
