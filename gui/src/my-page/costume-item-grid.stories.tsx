import type { Translator } from "@abth/i18n";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import type { PictureLane } from "../pictures/picture-lane";
import { STORY_EDITOR } from "../story-kit/costume";
import { i18nOf } from "../story-kit/env";
import { FAILING_LANE, STORY_LANE, WAITING_LANE } from "../story-kit/story-pictures";
import { WideWindow } from "../story-kit/wide-window";
import { CostumeItemGrid } from "./costume-item-grid";
import { itemsOf } from "./costume-parts";

interface Args {
  readonly onPick: (id: number) => void;
}

function Grid({ lane, args, i18n }: { lane: PictureLane; args: Args; i18n: Translator }) {
  const [chosen, setChosen] = useState(STORY_EDITOR.state.costume2);
  return (
    <WideWindow>
      {(wide) => (
        <CostumeItemGrid
          lane={lane}
          i18n={i18n}
          part="costume2"
          items={itemsOf(STORY_EDITOR, "costume2")}
          chosen={chosen}
          wide={wide}
          onPick={(id) => {
            setChosen(id);
            args.onPick(id);
          }}
        />
      )}
    </WideWindow>
  );
}

const meta = {
  title: "Fields/CostumeItemGrid",
  tags: ["my-page"],
  render: (args, { globals }) => <Grid lane={STORY_LANE} args={args} i18n={i18nOf(globals)} />,
  args: { onPick: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A slot's items, はずす first, the one worn ringed; larger cells in a wide window. */
export const Items: Story = {};

/** Each cell keeps its room while its thumbnail is on its way. */
export const ThumbnailsOnTheirWay: Story = {
  render: (args, { globals }) => <Grid lane={WAITING_LANE} args={args} i18n={i18nOf(globals)} />,
};

export const ThumbnailsFailed: Story = {
  render: (args, { globals }) => <Grid lane={FAILING_LANE} args={args} i18n={i18nOf(globals)} />,
};
