import type { Meta, StoryObj } from "@storybook/react-vite";

import { forgetSetting } from "../shared/kept-settings";
import { SEEN_TIPS_KEY } from "../shared/tips/seen-tips";
import { appOn } from "../story-kit/story-app";

const meta = {
  title: "Status/TipTour",
  tags: ["ui"],
  parameters: { layout: "fullscreen" },
  // Every other story starts with the tips seen, as they would stand over its page.
  beforeEach: () => forgetSetting(SEEN_TIPS_KEY),
  render: appOn("overview"),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Overview's tips, the whole app's first, one bubble at a time over the dimmed window. */
export const OnTheOverview: Story = {};

/** Scores' tips: the six-second hold, a row's menu, and on a phone the filters' row. */
export const OnScores: Story = { render: appOn("scores") };

/** Rating's switch between V1 and V2, and its share button. */
export const OnRating: Story = { render: appOn("rating") };

/** Know yourself's cards. */
export const OnKnowYourself: Story = { render: appOn("knowYourself") };

/** Costume's six-second hold for the items' pictures, and its history. */
export const OnCostume: Story = { render: appOn("costume") };

/** Nickname & title's six-second hold for the plate. */
export const OnNicknameAndTitle: Story = { render: appOn("nameTitle") };

/** Favourites' sets, their menu, reordering, the folder's history and the gift button. */
export const OnFavourites: Story = { render: appOn("favorites") };
