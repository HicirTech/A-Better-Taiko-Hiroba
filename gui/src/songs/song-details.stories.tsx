import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { type ChartSource, DEFAULT_CHART_SOURCE } from "../shared/song-catalogue/chart-source";
import { DEFAULT_SHOWN } from "../shared/song-catalogue/shown-difficulty";
import { modalLookOf, touchOf } from "../story-kit/devices";
import { i18nOf } from "../story-kit/env";
import { storySong } from "../story-kit/songs";
import { STORY_LANE } from "../story-kit/story-pictures";
import { STORY_CHART_PORT } from "../story-kit/story-port";
import { SongDetails } from "./song-details";

interface Args {
  /** The stand-in song whose details open. */
  readonly songNo: string;
  /** Where the charts' pictures come from, as Settings chose it. */
  readonly chartSource: ChartSource;
  readonly onClose: () => void;
}

const meta = {
  title: "Dialogs/SongDetails",
  tags: ["songs"],
  parameters: { layout: "fullscreen" },
  render: ({ songNo, chartSource, onClose }, { globals }) => (
    <SongDetails
      song={storySong(songNo)}
      port={STORY_CHART_PORT}
      lane={STORY_LANE}
      touchFirst={touchOf(globals)}
      modalLook={modalLookOf(globals)}
      chartSource={chartSource}
      shownDifficulty={DEFAULT_SHOWN}
      i18n={i18nOf(globals)}
      onClose={onClose}
    />
  ),
  args: { songNo: "1001", chartSource: DEFAULT_CHART_SOURCE, onClose: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A song's facts and charts, each with its density and picture; full screen on a phone. */
export const Song: Story = {};

/** Branched charts and an inner chart; the tempo changes halfway. */
export const BranchedWithAnInnerChart: Story = { args: { songNo: "1005" } };

/** No chart file: taiko.wiki's pictures, with a note, and no density. */
export const NoChartFile: Story = { args: { songNo: "1003" } };

/** The chart file's notes differ from the game's count: drawn anyway, with a line under it. */
export const NotesDiffer: Story = { args: { songNo: "1006" } };

/** Settings ask for taiko.wiki's pictures in place of drawn ones. */
export const TaikoWikiPictures: Story = { args: { chartSource: "wiki" } };
