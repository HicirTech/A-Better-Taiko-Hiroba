import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { listedOf } from "../shared/scores/score-order";
import type { ScoreView } from "../shared/session-port";
import { modalLookOf, touchOf } from "../story-kit/devices";
import { i18nOf, localeOf } from "../story-kit/env";
import { STORY_SCORES } from "../story-kit/scores";
import { storyCatalogue } from "../story-kit/songs";
import { STORY_LANE } from "../story-kit/story-pictures";
import { ScoreDetails } from "./score-details";

interface Args {
  readonly reading: boolean;
  readonly readingSong: boolean;
  readonly onReadSong: (score: ScoreView) => void;
  readonly onClose: () => void;
}

const BRANCHED = STORY_SCORES.scores.find((score) => score.songNo === "1005");

const meta = {
  title: "Dialogs/ScoreDetails",
  tags: ["songs"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => (
    <ScoreDetails
      {...args}
      listed={
        BRANCHED === undefined ? null : listedOf(BRANCHED, storyCatalogue(), localeOf(globals))
      }
      lane={STORY_LANE}
      touchFirst={touchOf(globals)}
      modalLook={modalLookOf(globals)}
      i18n={i18nOf(globals)}
    />
  ),
  args: { reading: false, readingSong: false, onReadSong: fn(), onClose: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A chart's marks, counts and hits, and the song read again; full screen on a phone. */
export const Chart: Story = {};

export const ReadingTheSong: Story = { args: { reading: true, readingSong: true } };
