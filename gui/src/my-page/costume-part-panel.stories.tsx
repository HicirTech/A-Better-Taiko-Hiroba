import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { STORY_EDITOR } from "../story-kit/costume";
import { i18nOf } from "../story-kit/env";
import { STORY_LANE } from "../story-kit/story-pictures";
import { WideWindow } from "../story-kit/wide-window";
import { PartPanel, type PartPanelProps } from "./costume-part-panel";

type Args = Pick<PartPanelProps, "part" | "held" | "onPickColour" | "onPickItem">;

const meta = {
  title: "Fields/PartPanel",
  tags: ["my-page"],
  render: (args, { globals }) => (
    <WideWindow>
      {(wide) => (
        <PartPanel
          {...args}
          view={STORY_EDITOR}
          draft={STORY_EDITOR.state}
          lane={STORY_LANE}
          i18n={i18nOf(globals)}
          wide={wide}
        />
      )}
    </WideWindow>
  ),
  args: { part: "costume3", held: false, onPickColour: fn(), onPickItem: fn() },
  argTypes: {
    part: {
      control: "select",
      options: [
        "colorFace",
        "colorBody",
        "colorLimb",
        "costume1",
        "costume2",
        "costume3",
        "costume4",
        "costume5",
      ],
    },
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The part on show: a slot's items. */
export const Items: Story = {};

/** A colour part's palette. */
export const Colours: Story = { args: { part: "colorFace" } };

/** A save is running: nothing can be picked, and the panel is dimmed. */
export const HeldWhileSaving: Story = { args: { held: true } };
