import type { Translator } from "@abth/i18n";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { CostumePart } from "../shared/costume-parts";
import { STORY_EDITOR } from "../story-kit/costume";
import { i18nOf } from "../story-kit/env";
import { STORY_LANE } from "../story-kit/story-pictures";
import { PartTiles } from "./costume-part-tiles";

interface Args {
  readonly wide: boolean;
  readonly held: boolean;
  readonly onPick: (part: CostumePart) => void;
}

function Tiles({ args, i18n }: { args: Args; i18n: Translator }) {
  const [shown, setShown] = useState<CostumePart>("colorFace");
  return (
    <PartTiles
      view={STORY_EDITOR}
      draft={STORY_EDITOR.state}
      lane={STORY_LANE}
      i18n={i18n}
      shown={shown}
      wide={args.wide}
      held={args.held}
      onPick={(part) => {
        setShown(part);
        args.onPick(part);
      }}
    />
  );
}

const meta = {
  title: "Navigation/PartTiles",
  tags: ["my-page"],
  render: (args, { globals }) => <Tiles args={args} i18n={i18nOf(globals)} />,
  args: { wide: true, held: false, onPick: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A wide window's tiles: the colours over the items, each group under its caption. */
export const Wide: Story = {};

/** A narrow window's tiles: one row. */
export const OneRow: Story = { args: { wide: false } };

export const HeldWhileSaving: Story = { args: { held: true } };
