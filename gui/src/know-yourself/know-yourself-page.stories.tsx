import { err } from "@abth/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { keepSets } from "../favorites/favorite-sets";
import { STORY_SETS } from "../story-kit/sets";
import { appOn } from "../story-kit/story-app";
import { neverAnswers } from "../story-kit/story-port";

const meta = {
  title: "Pages/Know yourself/KnowYourselfPage",
  tags: ["know-yourself"],
  parameters: { layout: "fullscreen" },
  beforeEach: () => keepSets(STORY_SETS),
  render: appOn("knowYourself"),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The difficulty chip and the six folded cards, from the kept scores and the song list. */
export const InTheWindow: Story = {};

/** The song list is on its way. */
export const SongListReading: Story = {
  render: appOn("knowYourself", { readSongCatalogue: neverAnswers }),
};

/** The song list could not be read: said once, not read again until the page opens again. */
export const SongListFailed: Story = {
  render: appOn("knowYourself", {
    readSongCatalogue: () => Promise.resolve(err({ code: "unreachable" })),
  }),
};

/** No chart listed yet: how to read the scores. */
export const NothingKept: Story = {
  render: appOn("knowYourself", {
    scores: () => Promise.resolve({ scores: [], unread: 0, songs: [] }),
    listedCharts: () => Promise.resolve({ charts: [], songs: [] }),
  }),
};
