import type { RecentPlay } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";

import { LEVEL_DIFFICULTY } from "../favorites/genre-look";
import type { PictureLane } from "../pictures/picture-lane";
import { i18nOf } from "../story-kit/env";
import { STORY_PLAYS, storyPlay } from "../story-kit/plays";
import { lookOf, STORY_SONGS } from "../story-kit/songs";
import { STORY_LANE, WAITING_LANE } from "../story-kit/story-pictures";
import { PlayRow } from "./play-row";

const LIST = { listStyle: "none", m: 0, p: 0, maxWidth: 640 } as const;

/** What the song list tells of a play's song, found by its title as the page finds it. */
function listed(play: RecentPlay, i18n: Translator) {
  const song = STORY_SONGS.find((one) => one.title === play.songTitle);
  if (song === undefined) {
    return {};
  }
  const look = lookOf(song.songNo, i18n.locale);
  return {
    name: { text: look.name, lang: look.lang },
    genres: look.genres,
    stars: look.levels?.[LEVEL_DIFFICULTY[play.level]] ?? null,
  };
}

const rows = (i18n: Translator, lane: PictureLane, plays: readonly RecentPlay[]) => (
  <Box component="ul" sx={LIST}>
    {plays.map((play, index) => (
      <PlayRow
        key={`${play.songTitle}-${play.level}`}
        play={play}
        {...listed(play, i18n)}
        lane={lane}
        order={index}
        i18n={i18n}
        onOpen={action("open details")}
      />
    ))}
  </Box>
);

const meta = {
  title: "Rows and lists/PlayRow",
  tags: ["history"],
  render: (_args, { globals }) => rows(i18nOf(globals), STORY_LANE, STORY_PLAYS),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Recent plays as the page lists them: the difficulty leads the marks, the level under them. */
export const Plays: Story = {};

/** Heading a chart's details: the name scrolls, and the hits are left to the details. */
export const AsAHeading: Story = {
  render: (_args, { globals }) => {
    const i18n = i18nOf(globals);
    const play = storyPlay("1009", { crown: "gold", scoreRank: 7 });
    return (
      <Box sx={{ maxWidth: 480 }}>
        <PlayRow
          play={play}
          {...listed(play, i18n)}
          lane={STORY_LANE}
          order={0}
          i18n={i18n}
          heading="story-heading"
        />
      </Box>
    );
  },
};

/** The difficulty, crown and rank keep their room while Hiroba's icons are on their way. */
export const IconsOnTheirWay: Story = {
  render: (_args, { globals }) => rows(i18nOf(globals), WAITING_LANE, STORY_PLAYS.slice(0, 3)),
};

/** A play the song list lacks: Hiroba's own title and its one genre, and no level. */
export const NotInTheSongList: Story = {
  render: (_args, { globals }) =>
    rows(i18nOf(globals), STORY_LANE, [{ ...storyPlay("1001"), songTitle: "曲リストにない曲" }]),
};
