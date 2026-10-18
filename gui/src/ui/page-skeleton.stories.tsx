import type { Meta, StoryObj } from "@storybook/react-vite";

import type { Page } from "../navigation/pages";
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

/** Recent plays: a window of play rows. */
export const RecentPlays = reading("history");

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
