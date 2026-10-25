import { chartKey, rateOurTaikoV1 } from "@abth/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { PictureLane } from "../pictures/picture-lane";
import { ratingDataOf } from "../shared/rating-data/read-rating-data";
import { i18nOf, type StoryGlobals } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { STORY_RATING_DATA, STORY_SCORES } from "../story-kit/scores";
import { storyCatalogue } from "../story-kit/songs";
import { STORY_LANE, WAITING_LANE } from "../story-kit/story-pictures";
import { RatingSnapshot } from "./rating-snapshot";

const DATA = ratingDataOf(STORY_RATING_DATA) ?? new Map();
const RATED = rateOurTaikoV1(STORY_SCORES.scores, DATA);
const SCORE_OF = new Map(STORY_SCORES.scores.map((score) => [chartKey(score), score]));
const CATALOGUE = storyCatalogue();

const snapshot = (lane: PictureLane, globals: StoryGlobals) => (
  <RatingSnapshot
    profile={STORY_PROFILE}
    rated={RATED}
    scoreOf={SCORE_OF}
    data={DATA}
    catalogue={CATALOGUE}
    lane={lane}
    readAt={STORY_PROFILE.fetchedAt}
    i18n={i18nOf(globals)}
  />
);

const meta = {
  title: "Cards and sections/RatingSnapshot",
  tags: ["rating"],
  render: (_args, { globals }) => snapshot(STORY_LANE, globals),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Rating page as a picture to share, the same in every theme, mode and window. */
export const Shown: Story = {};

export const PicturesOnTheirWay: Story = {
  render: (_args, { globals }) => snapshot(WAITING_LANE, globals),
};
