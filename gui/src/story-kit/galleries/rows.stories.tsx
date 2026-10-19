import type { Meta, StoryObj } from "@storybook/react-vite";

import * as LevelBadges from "../../favorites/level-badges.stories";
import * as PickerList from "../../favorites/picker-list.stories";
import * as ScrollingText from "../../favorites/scrolling-text.stories";
import * as SongRow from "../../favorites/song-row.stories";
import * as SortableList from "../../favorites/sortable-list.stories";
import * as HistoryRow from "../../history/history-row.stories";
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
        { name: "SongRow (new)", meta: SharedRow.default, story: SharedRow.Plays },
        { name: "SongRow (new), ticked", meta: SharedRow.default, story: SharedRow.Ticked },
        { name: "SongRow", meta: SongRow.default, story: SongRow.WithTempo },
        { name: "SongRow, opening details", meta: SongRow.default, story: SongRow.OpensDetails },
        { name: "HistoryRow", meta: HistoryRow.default, story: HistoryRow.Plays },
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
