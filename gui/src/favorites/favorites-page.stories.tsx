import { err } from "@abth/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { STORY_SETS } from "../story-kit/sets";
import { appOn } from "../story-kit/story-app";
import { neverAnswers } from "../story-kit/story-port";
import { keepSets } from "./favorite-sets";

const meta = {
  title: "Pages/Favourites/FavoritesPage",
  tags: ["favorites"],
  parameters: { layout: "fullscreen" },
  beforeEach: () => keepSets(STORY_SETS),
  render: appOn("favorites"),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The 大好きな曲 and the お気に入り folder, the sets kept on the device in the drawer: a button on
 * a PC, a swipe from the right edge on an Android device. */
export const InTheWindow: Story = {};

/** No set kept yet. */
export const NoSets: Story = { beforeEach: () => keepSets([]) };

export const Reading: Story = { render: appOn("favorites", { openFavorites: neverAnswers }) };

export const ReadFailed: Story = {
  render: appOn("favorites", {
    openFavorites: () => Promise.resolve(err({ kind: "unreachable" })),
  }),
};
