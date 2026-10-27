import { chartKey, type PlayerRating, type RatingSystem, ratePlayer } from "@abth/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { PictureLane } from "../pictures/picture-lane";
import { ratingDataOf } from "../shared/rating-data/read-rating-data";
import { i18nOf, type StoryGlobals } from "../story-kit/env";
import { STORY_PROFILE } from "../story-kit/profile";
import { STORY_RATING_DATA, STORY_RATING_DATA_V2, STORY_SCORES } from "../story-kit/scores";
import { storyCatalogue } from "../story-kit/songs";
import { STORY_LANE, WAITING_LANE } from "../story-kit/story-pictures";
import { RatingSnapshot } from "./rating-snapshot";

const ratedBy = (system: RatingSystem, text: string): PlayerRating => {
  const data = ratingDataOf(system, text);
  return data === null
    ? { system, figures: [], charts: [] }
    : ratePlayer(STORY_SCORES.scores, data);
};
const RATED: Readonly<Record<RatingSystem, PlayerRating>> = {
  ourtaikoV1: ratedBy("ourtaikoV1", STORY_RATING_DATA),
  ourtaikoV2: ratedBy("ourtaikoV2", STORY_RATING_DATA_V2),
};
const SCORE_OF = new Map(STORY_SCORES.scores.map((score) => [chartKey(score), score]));
const CATALOGUE = storyCatalogue();

const snapshot = (lane: PictureLane, globals: StoryGlobals, system: RatingSystem) => (
  <RatingSnapshot
    profile={STORY_PROFILE}
    rated={RATED[system]}
    scoreOf={SCORE_OF}
    catalogue={CATALOGUE}
    lane={lane}
    readAt={STORY_PROFILE.fetchedAt}
    i18n={i18nOf(globals)}
  />
);

const meta = {
  title: "Cards and sections/RatingSnapshot",
  tags: ["rating"],
  render: (_args, { globals }) => snapshot(STORY_LANE, globals, "ourtaikoV1"),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Rating page as a picture to share, the same in every theme, mode and window. */
export const Shown: Story = {};

/** Rated by V2: its own six skills, Hard charts among the rest, its name in the bar. */
export const RatedByV2: Story = {
  render: (_args, { globals }) => snapshot(STORY_LANE, globals, "ourtaikoV2"),
};

export const PicturesOnTheirWay: Story = {
  render: (_args, { globals }) => snapshot(WAITING_LANE, globals, "ourtaikoV1"),
};
