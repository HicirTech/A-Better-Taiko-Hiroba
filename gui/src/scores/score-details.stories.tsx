import { Typography } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import { fn } from "storybook/test";

import { HIROBA_LANG } from "../language/hiroba-lang";
import type { ScoreView } from "../session-port";
import { i18nOf, localeOf } from "../story-kit/env";
import { storyPlay } from "../story-kit/plays";
import { STORY_SCORES } from "../story-kit/scores";
import { storyCatalogue, storySong } from "../story-kit/songs";
import { STORY_LANE } from "../story-kit/story-pictures";
import { ScoreDetails } from "./score-details";
import { listedOf } from "./scores-page";

interface Args {
  readonly reading: boolean;
  readonly readingSong: boolean;
  readonly onReadSong: (score: ScoreView) => void;
  readonly onClose: () => void;
}

const BRANCHED = STORY_SCORES.scores.find((score) => score.songNo === "1005");

const meta = {
  title: "Dialogs/ScoreDetails",
  tags: ["scores"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => (
    <ScoreDetails
      {...args}
      listed={
        BRANCHED === undefined ? null : listedOf(BRANCHED, storyCatalogue(), localeOf(globals))
      }
      lane={STORY_LANE}
      i18n={i18nOf(globals)}
    />
  ),
  args: { reading: false, readingSong: false, onReadSong: fn(), onClose: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A chart's scores: its marks, counts and hits, with a button that reads the song again; full
 * screen on a phone. */
export const Chart: Story = {};

export const ReadingTheSong: Story = { args: { reading: true, readingSong: true } };

/** A recent play whose chart has no details yet: why, and a way to read them. */
export const PlayWithoutDetails: Story = {
  render: (args, { globals }) => (
    <ScoreDetails
      {...args}
      listed={null}
      notice={{
        play: storyPlay("1009"),
        name: { text: storySong("1009").title, lang: HIROBA_LANG },
        why: <Typography color="text.secondary">{i18nOf(globals).t("history.noScore")}</Typography>,
        onRead: action("read the song"),
      }}
      lane={STORY_LANE}
      i18n={i18nOf(globals)}
    />
  ),
};
