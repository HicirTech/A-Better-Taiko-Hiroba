import { err } from "@abth/core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { keepSets } from "../shared/sets/favorite-sets";
import { STORY_SETS } from "../story-kit/sets";
import { found, press } from "../story-kit/steps";
import { appOn } from "../story-kit/story-app";
import { neverAnswers } from "../story-kit/story-port";

const meta = {
  title: "Pages/Favourites/FavoritesPage",
  tags: ["favorites"],
  parameters: { layout: "fullscreen" },
  beforeEach: () => keepSets(STORY_SETS),
  render: appOn("favorites"),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The 大好きな曲, the お気に入り folder, and the sets kept on the device in the drawer. */
export const InTheWindow: Story = {};

/** No set kept yet. */
export const NoSets: Story = { beforeEach: () => keepSets([]) };

/** A kept folder put back from History: shown as a set is, for the bar's Sync to write. */
export const KeptFolderPutBack: Story = {
  play: async () => {
    await found("#favorites-history", 10_000);
    await press("#favorites-history");
    await press("#favorite-history-entry-1-header");
    await press("#favorite-history-put-back-1");
  },
};

export const Reading: Story = { render: appOn("favorites", { openFavorites: neverAnswers }) };

export const ReadFailed: Story = {
  render: appOn("favorites", {
    openFavorites: () => Promise.resolve(err({ kind: "unreachable" })),
  }),
};
