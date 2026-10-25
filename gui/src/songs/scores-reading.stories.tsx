import type { Meta, StoryObj } from "@storybook/react-vite";

import type { ChosenSong } from "../shared/scores/use-scores";
import type { ScoresProgress } from "../shared/session-port";
import { i18nOf } from "../story-kit/env";
import { storySong } from "../story-kit/songs";
import { ScoresReading } from "./scores-reading";

interface Args {
  readonly progress: ScoresProgress | null;
  readonly song: ChosenSong | null;
}

const meta = {
  title: "Status/ScoresReading",
  tags: ["songs"],
  render: ({ progress, song }, { globals }) => (
    <ScoresReading
      id="story-scores-reading"
      i18n={i18nOf(globals)}
      progress={progress}
      song={song}
    />
  ),
  args: { progress: { step: "recentPlays", page: 3 }, song: null },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A walk of the recent plays first, which cannot tell how far it has to go. */
export const WalkingThePlays: Story = {};

/** The score lists counted: the bar fills. */
export const ReadingTheLists: Story = {
  args: { progress: { step: "lists", done: 12, total: 40 } },
};

export const ReadingTheCharts: Story = {
  args: { progress: { step: "details", done: 120, total: 480 } },
};

/** One song's scores, read as its details ask. */
export const OneSong: Story = {
  args: { progress: null, song: { songNo: "1001", songTitle: storySong("1001").title } },
};
