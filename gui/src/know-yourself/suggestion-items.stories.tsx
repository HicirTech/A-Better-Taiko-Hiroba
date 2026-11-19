import type { Meta, StoryObj } from "@storybook/react-vite";

import { ratingFormats } from "../shared/rating-data/rating-formats";
import {
  STORY_COMFORT,
  STORY_KNOWN,
  STORY_PICKS,
  STORY_SUGGESTED_BY,
  storyPlaysOf,
} from "../story-kit/know";
import { knowCards } from "../story-kit/know-cards";
import type { PageParts } from "./page-parts";
import { ComfortItem, HarderItem, JoyItem } from "./suggestion-items";
import { shownBy } from "./suggestions";

const SHOWN = STORY_PICKS === null ? new Set<string>() : shownBy(STORY_PICKS);
const formatsOf = ({ i18n }: PageParts) => ratingFormats(i18n.locale, "ourtaikoV1");

const meta = {
  title: "Cards and sections/SuggestionItems",
  tags: ["know-yourself"],
  render: (_args, { globals }) =>
    knowCards(
      (parts) => (
        <HarderItem
          by={STORY_SUGGESTED_BY}
          pick={STORY_PICKS?.harder ?? null}
          formats={formatsOf(parts)}
          parts={parts}
          opened
        />
      ),
      globals,
    ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The charts not cleared just above the player's level, the nearest first. */
export const ALittleHarder: Story = {};

/** The cleared charts within the player's level that would count, the smallest step first. */
export const ScoresInComfort: Story = {
  render: (_args, { globals }) =>
    knowCards(
      (parts) => (
        <ComfortItem
          by={STORY_SUGGESTED_BY}
          pick={STORY_COMFORT}
          formats={formatsOf(parts)}
          parts={parts}
          opened
        />
      ),
      globals,
    ),
};

/** The charts at the tempo and density the player plays most, never-played ones first. */
export const ForTheJoyOfIt: Story = {
  render: (_args, { globals }) =>
    knowCards(
      (parts) => (
        <JoyItem
          charts={STORY_KNOWN}
          playsOf={storyPlaysOf}
          shown={SHOWN}
          formats={formatsOf(parts)}
          parts={parts}
          opened
        />
      ),
      globals,
    ),
};

/** On a difficulty the rating does not rate, and with no chart rated yet: each card says so. */
export const NothingToRate: Story = {
  render: (_args, { globals }) =>
    knowCards(
      (parts) => (
        <>
          <HarderItem
            by={STORY_SUGGESTED_BY}
            pick={{ kind: "notRated" }}
            formats={formatsOf(parts)}
            parts={parts}
          />
          <ComfortItem
            by={STORY_SUGGESTED_BY}
            pick={{ kind: "noneRated" }}
            formats={formatsOf(parts)}
            parts={parts}
          />
          <ComfortItem
            by={STORY_SUGGESTED_BY}
            pick={{ kind: "fewRated" }}
            formats={formatsOf(parts)}
            parts={parts}
          />
          <JoyItem
            charts={[]}
            playsOf={storyPlaysOf}
            shown={SHOWN}
            formats={formatsOf(parts)}
            parts={parts}
          />
        </>
      ),
      globals,
    ),
};

/** The rating's data on its way, then failed to read: the rating's two cards wait. */
export const RatingDataAway: Story = {
  render: (_args, { globals }) =>
    knowCards(
      (parts) => (
        <>
          <HarderItem
            by={{ ...STORY_SUGGESTED_BY, data: null, reading: true }}
            pick={null}
            formats={formatsOf(parts)}
            parts={parts}
          />
          <ComfortItem
            by={{ ...STORY_SUGGESTED_BY, data: null, failure: "unreachable" }}
            pick={null}
            formats={formatsOf(parts)}
            parts={parts}
          />
        </>
      ),
      globals,
    ),
};
