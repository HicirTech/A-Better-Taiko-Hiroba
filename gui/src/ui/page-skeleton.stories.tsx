import { err } from "@abth/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { Page } from "../navigation/pages";
import { found } from "../story-kit/steps";
import { appOn } from "../story-kit/story-app";
import { createStoryPort, neverAnswers } from "../story-kit/story-port";

const meta = {
  title: "Status/PageSkeleton",
  tags: ["ui"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The window opened on `page` while my page is read, which never ends here. */
const reading = (page: Page): Story => ({ render: appOn(page, { readProfile: neverAnswers }) });

const SLOW_READ_MS = 2_500;

/** The window opened on `page`, my page read slowly: the skeleton, then the page taking over. */
const readSlowly = (page: Page): Story => ({
  render: appOn(page, {
    readProfile: () =>
      new Promise((done) => setTimeout(done, SLOW_READ_MS)).then(() =>
        createStoryPort().readProfile(),
      ),
  }),
});

/** The Overview's skeleton fading out as the page fades in; Storybook's Remount shows it again. */
export const OverviewAfterAWait = readSlowly("overview");

/** Scores after a wait: the device's copy comes a moment after my page. */
export const ScoresAfterAWait = readSlowly("scores");

/** The Overview's shape: the search, the portrait, plate and panel, the shares and the medal. */
export const Overview = reading("overview");

/** Scores: the search, the filter chips and the rows. */
export const Scores = reading("scores");

/** Rating: the figure, the radar and the rated rows. */
export const Rating = reading("rating");

/** Know yourself: the difficulty chip and the folded cards. */
export const KnowYourself = reading("knowYourself");

/** Costume: the preview, the part tiles and the palette, as wide or narrow as the window. */
export const Costume = reading("costume");

/** Nickname & title: the plate and the two rows with their buttons. */
export const NicknameAndTitle = reading("nameTitle");

/** Favourites: the heading, the favourite song and the folder's rows. */
export const Favourites = reading("favorites");

// A whole window's first reads can take longer than a play's usual wait of a second.
const FIRST_READS_MS = 10_000;

/** F5 on the page shown, as a computer reads again. */
const readAgain = async (page: string) => {
  await found(page, FIRST_READS_MS);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "F5" }));
};

/** Scores read again, never ending: shut at once, then its skeleton, the charts counted. */
export const ScoresReadAgain: Story = {
  render: appOn("scores", {
    readScores: neverAnswers,
    scoresProgress: () => Promise.resolve({ step: "details", done: 12, total: 40 }),
  }),
  play: () => readAgain("#scores-page"),
};

/** Scores read again, still walking the recent plays: its skeleton says the page reached. */
export const ScoresReadAgainWalkingPlays: Story = {
  render: appOn("scores", {
    readScores: neverAnswers,
    scoresProgress: () => Promise.resolve({ step: "recentPlays", page: 3 }),
  }),
  play: () => readAgain("#scores-page"),
};

/** The Overview read again, the refresh refused: my page as read before, the failure over it. */
export const OverviewReadAgainFailed: Story = {
  render: appOn("overview", {
    refreshHiroba: () => Promise.resolve(err({ kind: "notRefreshed" })),
  }),
  play: () => readAgain("#profile"),
};

/** Costume read again, the refresh refused: the editor read before, open, under the failure. */
export const CostumeReadAgainFailed: Story = {
  render: appOn("costume", { refreshHiroba: () => Promise.resolve(err({ kind: "notRefreshed" })) }),
  play: () => readAgain('#costume-page[data-step="editing"]'),
};
