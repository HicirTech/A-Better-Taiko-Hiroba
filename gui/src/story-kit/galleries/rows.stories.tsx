import type { Meta, StoryObj } from "@storybook/react-vite";

import * as LevelBadges from "../../favorites/level-badges.stories";
import * as PickerList from "../../favorites/picker-list.stories";
import * as ScrollingText from "../../favorites/scrolling-text.stories";
import * as SongLookRow from "../../favorites/song-look-row.stories";
import * as SortableList from "../../favorites/sortable-list.stories";
import * as PlayRow from "../../history/play-row.stories";
import * as ChartList from "../../know-yourself/chart-list.stories";
import * as SharedRow from "../../songs/song-row.stories";
import * as RowList from "../../ui/row-list.stories";
import { Gallery } from "../gallery";

const meta = {
  title: "Rows and lists/Side by side",
  tags: ["gallery"],
  parameters: { layout: "fullscreen" },
  render: (_args, context) => (
    <Gallery
      context={context}
      members={[
        { name: "SongRow", meta: SharedRow.default, story: SharedRow.Pressed },
        { name: "SongRow, ticked", meta: SharedRow.default, story: SharedRow.Ticked },
        { name: "SongRow, with marks", meta: SharedRow.default, story: SharedRow.WithMarks },
        { name: "PlayRow", meta: PlayRow.default, story: PlayRow.Plays },
        { name: "SongLookRow", meta: SongLookRow.default, story: SongLookRow.WithTempo },
        { name: "RowList", meta: RowList.default, story: RowList.AFewRows },
        { name: "PickerList", meta: PickerList.default, story: PickerList.SearchMarked },
        { name: "ChartList", meta: ChartList.default, story: ChartList.NotCleared },
        { name: "SortableList", meta: SortableList.default, story: SortableList.Sets },
        { name: "LevelBadges", meta: LevelBadges.default, story: LevelBadges.ExtremeInFront },
        { name: "ScrollingText", meta: ScrollingText.default, story: ScrollingText.TooLong },
      ]}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The song rows, chart rows and lists, to compare how each draws a song. */
export const SideBySide: Story = { name: "Side by side" };
