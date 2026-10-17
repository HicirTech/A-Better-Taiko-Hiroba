import type { Translator } from "@abth/i18n";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import { STORY_EDITOR } from "../story-kit/costume";
import { i18nOf } from "../story-kit/env";
import { WideWindow } from "../story-kit/wide-window";
import { Palette } from "./costume-palette";

interface Args {
  readonly onPick: (id: number) => void;
}

function Swatches({ args, i18n }: { args: Args; i18n: Translator }) {
  const [chosen, setChosen] = useState(STORY_EDITOR.state.colorBody);
  return (
    <WideWindow>
      {(wide) => (
        <Palette
          editor={STORY_EDITOR}
          part="colorBody"
          chosen={chosen}
          wide={wide}
          i18n={i18n}
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
  title: "Fields/Palette",
  tags: ["my-page"],
  render: (args, { globals }) => <Swatches args={args} i18n={i18nOf(globals)} />,
  args: { onPick: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A colour part's swatches, the one picked ringed; larger swatches in a wide window. */
export const Colours: Story = {};
