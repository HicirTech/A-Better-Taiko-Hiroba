import { err } from "@abth/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { keepSets } from "../shared/sets/favorite-sets";
import { STORY_SETS } from "../story-kit/sets";
import { appOn, readAgain } from "../story-kit/story-app";
import { neverAnswers } from "../story-kit/story-port";

const meta = {
  title: "Pages/Recent plays/HistoryPage",
  tags: ["history"],
  parameters: { layout: "fullscreen" },
  beforeEach: () => keepSets(STORY_SETS),
  render: appOn("history"),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The plays kept, newest first; a play opens its chart, its menu adds its song to a set. */
export const InTheWindow: Story = {};

/** Nothing kept yet, and the first read on its way. */
export const FirstRead: Story = {
  render: appOn("history", {
    recentPlays: () => Promise.resolve([]),
    readRecentPlays: neverAnswers,
  }),
};

/** A walk that stopped at a page. */
export const ReadFailed: Story = {
  render: appOn("history", {
    readRecentPlays: () => Promise.resolve(err({ kind: "timedOut", page: 3 })),
  }),
  play: readAgain,
};
