import type { Meta, StoryObj } from "@storybook/react-vite";

import * as PlayMenu from "../../history/play-menu.stories";
import * as ItemMenu from "../../ui/item-menu.stories";
import { Gallery } from "../gallery";

const meta = {
  title: "Menus/Side by side",
  tags: ["gallery"],
  parameters: { layout: "fullscreen" },
  render: (_args, context) => (
    <Gallery
      overlays
      context={context}
      members={[
        { name: "ItemMenu, on a computer", meta: ItemMenu.default, story: ItemMenu.OnAComputer },
        {
          name: "ItemMenu, on a touch screen",
          meta: ItemMenu.default,
          story: ItemMenu.OnATouchScreen,
        },
        {
          name: "ItemMenu, one action",
          meta: ItemMenu.default,
          story: ItemMenu.OneActionOnAComputer,
        },
        { name: "PlayMenu", meta: PlayMenu.default, story: PlayMenu.RightClicked },
      ]}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every item menu, each in a box of its own, to see their shapes side by side. */
export const SideBySide: Story = { name: "Side by side" };
