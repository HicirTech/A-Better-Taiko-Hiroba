import { Typography } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import { fn } from "storybook/test";
import { HIROBA_LANG } from "../shared/language/hiroba-lang";
import { listedOf } from "../shared/scores/score-order";
import type { ScoreView } from "../shared/session-port";
import { LEVEL_DIFFICULTY } from "../shared/song-catalogue/genre-look";
import { modalLookOf, touchOf } from "../story-kit/devices";
import { i18nOf, localeOf } from "../story-kit/env";
import { storyPlay } from "../story-kit/plays";
import { STORY_SCORES } from "../story-kit/scores";
import { storyCatalogue, storySong } from "../story-kit/songs";
import { STORY_LANE } from "../story-kit/story-pictures";
import { ScoreDetails } from "./score-details";

interface Args {
  readonly reading: boolean;
  readonly readingSong: boolean;
  readonly onReadSong: (score: ScoreView) => void;
  readonly onClose: () => void;
}

const BRANCHED = STORY_SCORES.scores.find((score) => score.songNo === "1005");
const UNREAD_SONG = storySong("1009");
const UNREAD_PLAY = storyPlay("1009");

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

/** A recent play whose chart has no details yet: why, and a way to read them. */
export const PlayWithoutDetails: Story = {
  render: (args, { globals }) => (
    <ScoreDetails
      {...args}
      listed={null}
      notice={{
        play: UNREAD_PLAY,
        name: { text: UNREAD_SONG.title, lang: HIROBA_LANG },
        genres: UNREAD_SONG.genres,
        stars: UNREAD_SONG.levels[LEVEL_DIFFICULTY[UNREAD_PLAY.level]],
        why: <Typography color="text.secondary">{i18nOf(globals).t("history.noScore")}</Typography>,
        onRead: action("read the song"),
      }}
      lane={STORY_LANE}
      touchFirst={touchOf(globals)}
      modalLook={modalLookOf(globals)}
      i18n={i18nOf(globals)}
    />
  ),
};
