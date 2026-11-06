import { err, ok, parseRatingData, type RatingSnapshot, ratePlayer, snapshotOf } from "@abth/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { keepStartingRating } from "../shared/rating-data/starting-rating";
import { PAGE_RATING_DATA, PAGE_SCORES } from "../story-kit/scores";
import { appOn } from "../story-kit/story-app";
import { neverAnswers } from "../story-kit/story-port";

const meta = {
  title: "Pages/Rating/RatingPage",
  tags: ["rating"],
  parameters: { layout: "fullscreen" },
  render: appOn("rating"),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The rating and its skills from the kept scores, and the charts that count and come next. */
export const InTheWindow: Story = {};

/** Ratings kept from reads gone by: the line is whole, as no day before them is worked out. */
export const KeptOverTime: Story = {
  render: (args, context) => {
    const data = parseRatingData("ourtaikoV1", JSON.parse(PAGE_RATING_DATA.ourtaikoV1));
    const kept: readonly RatingSnapshot[] =
      data === null
        ? []
        : [0.3, 0.12, 0].map((lower, place) => {
            const { figures, charts } = snapshotOf(
              ratePlayer(PAGE_SCORES.scores, data),
              `2026-0${7 + place}-15T10:00:00.000Z`,
            );
            return {
              at: `2026-0${7 + place}-15T10:00:00.000Z`,
              figures: figures.map((one) => ({ ...one, value: one.value - lower })),
              charts,
            };
          });
    return appOn("rating", {
      ratingHistory: () => Promise.resolve(kept),
      keepRating: () => Promise.resolve(kept),
    })(args, context);
  },
};

/** The rating system's data is on its way. */
export const DataReading: Story = { render: appOn("rating", { readRatingData: neverAnswers }) };

export const DataFailed: Story = {
  render: appOn("rating", { readRatingData: () => Promise.resolve(err({ code: "unreachable" })) }),
};

/** Settings' default is V2: the page opens on its rating, its six skills and its constants. */
export const OpensOnV2: Story = {
  beforeEach: () => keepStartingRating("ourtaikoV2"),
};

/** V2's data could not be read: the failure, and the switch back to V1 above it. */
export const V2DataFailed: Story = {
  beforeEach: () => keepStartingRating("ourtaikoV2"),
  render: appOn("rating", {
    readRatingData: (system) =>
      Promise.resolve(
        system === "ourtaikoV1"
          ? ok({ text: PAGE_RATING_DATA.ourtaikoV1, sentAt: Date.now() })
          : err({ code: "unreachable" }),
      ),
  }),
};
