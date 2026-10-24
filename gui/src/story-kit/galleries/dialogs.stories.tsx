import type { Meta, StoryObj } from "@storybook/react-vite";
import * as SongPicker from "../../favorites/song-picker.stories";
import * as AddToSetDialog from "../../history/add-to-set-dialog.stories";
import * as ReadEveryPlayDialog from "../../history/read-every-play-dialog.stories";
import * as AddSongsDialog from "../../know-yourself/add-songs-dialog.stories";
import * as CostumeHistoryDialog from "../../my-page/costume-history-dialog.stories";
import * as ReadEveryDialog from "../../scores/read-every-dialog.stories";
import * as ChartViewer from "../../songs/chart-viewer.stories";
import * as ScoreDetails from "../../songs/score-details.stories";
import * as SetNameDialog from "../../songs/set-name-dialog.stories";
import * as SongDetails from "../../songs/song-details.stories";
import * as ChoiceDialog from "../../ui/choice-dialog.stories";
import * as LargeModal from "../../ui/large-modal.stories";
import * as SimpleDialog from "../../ui/simple-dialog.stories";
import * as UpdateDialog from "../../updates/update-dialog.stories";
import { Gallery } from "../gallery";

const meta = {
  title: "Dialogs/Side by side",
  tags: ["gallery"],
  parameters: { layout: "fullscreen" },
  render: (_args, context) => (
    <Gallery
      overlays
      context={context}
      members={[
        { name: "SimpleDialog", meta: SimpleDialog.default, story: SimpleDialog.ADeletion },
        {
          name: "SimpleDialog, a line to type",
          meta: SimpleDialog.default,
          story: SimpleDialog.ALineToType,
        },
        { name: "LargeModal", meta: LargeModal.default, story: LargeModal.Words },
        { name: "ChoiceDialog", meta: ChoiceDialog.default, story: ChoiceDialog.WithSubtitle },
        { name: "AddToSetDialog", meta: AddToSetDialog.default, story: AddToSetDialog.WhichSet },
        { name: "AddSongsDialog", meta: AddSongsDialog.default, story: AddSongsDialog.WhichSet },
        { name: "SetNameDialog", meta: SetNameDialog.default, story: SetNameDialog.NewSet },
        { name: "UpdateDialog", meta: UpdateDialog.default, story: UpdateDialog.NewVersion },
        { name: "ReadEveryDialog", meta: ReadEveryDialog.default, story: ReadEveryDialog.Asking },
        {
          name: "ReadEveryPlayDialog",
          meta: ReadEveryPlayDialog.default,
          story: ReadEveryPlayDialog.Asking,
        },
        {
          name: "CostumeHistoryDialog",
          meta: CostumeHistoryDialog.default,
          story: CostumeHistoryDialog.Sets,
        },
        { name: "SongPicker", meta: SongPicker.default, story: SongPicker.PickOne },
        { name: "ScoreDetails", meta: ScoreDetails.default, story: ScoreDetails.Chart },
        { name: "SongDetails", meta: SongDetails.default, story: SongDetails.Song },
        { name: "ChartViewer", meta: ChartViewer.default, story: ChartViewer.Chart },
      ]}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every dialog the app opens, each in a box of its own, to see their shapes side by side. */
export const SideBySide: Story = { name: "Side by side" };
