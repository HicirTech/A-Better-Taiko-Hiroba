import type { Meta, StoryObj } from "@storybook/react-vite";
import * as ThumbnailsUnavailable from "../../my-page/costume-item-grid.thumbnails-unavailable.stories";
import * as CostumeNotes from "../../my-page/costume-notes.stories";
import * as PreviewFailure from "../../my-page/costume-preview-box.preview-failure.stories";
import * as KigurumiInfo from "../../my-page/kigurumi-info.stories";
import * as PictureLoading from "../../songs/chart-picture.picture-loading.stories";
import * as ChartPicture from "../../songs/chart-picture.stories";
import * as ScoresReading from "../../songs/scores-reading.stories";
import * as SongListFailed from "../../songs/song-list-failed.stories";
import * as HoldRing from "../../ui/long-hold.stories";
import * as NoteAlert from "../../ui/note-alert.stories";
import * as OperationSnackbar from "../../ui/operation-snackbar.stories";
import * as PageCrash from "../../ui/page-crash.stories";
import * as ProgressBar from "../../ui/progress-bar.stories";
import * as LoadFailed from "../../ui/read-failure-alert.load-failed.stories";
import * as ReadFailureAlert from "../../ui/read-failure-alert.stories";
import * as StatusNote from "../../ui/status-note.stories";
import * as WriteOutcomeSnackbar from "../../ui/write-outcome.stories";
import { Gallery } from "../gallery";

const meta = {
  title: "Status/Side by side",
  tags: ["gallery"],
  parameters: { layout: "fullscreen" },
  render: (_args, context) => (
    <Gallery
      context={context}
      members={[
        {
          name: "ReadFailureAlert",
          meta: ReadFailureAlert.default,
          story: ReadFailureAlert.HirobaPage,
        },
        {
          name: "OperationSnackbar",
          meta: OperationSnackbar.default,
          story: OperationSnackbar.SaveFailed,
          fixed: true,
        },
        {
          name: "WriteOutcomeSnackbar",
          meta: WriteOutcomeSnackbar.default,
          story: WriteOutcomeSnackbar.RefusedInHirobasWords,
          fixed: true,
        },
        { name: "ProgressBar", meta: ProgressBar.default, story: ProgressBar.AReadOfEveryScore },
        {
          name: "ScoresReading",
          meta: ScoresReading.default,
          story: ScoresReading.ReadingTheCharts,
        },
        { name: "StatusNote", meta: StatusNote.default, story: StatusNote.InACard },
        { name: "HoldRing", meta: HoldRing.default, story: HoldRing.Filling },
        { name: "PictureLoading", meta: PictureLoading.default, story: PictureLoading.Loading },
        { name: "LoadFailed", meta: LoadFailed.default, story: LoadFailed.WithCodes },
        { name: "NoteAlert", meta: NoteAlert.default, story: NoteAlert.Informing },
        { name: "NoteAlert, warning", meta: NoteAlert.default, story: NoteAlert.Warning },
        { name: "PageCrash", meta: PageCrash.default, story: PageCrash.InPlace },
        { name: "SongListFailed", meta: SongListFailed.default, story: SongListFailed.Failed },
        { name: "ChartPicture", meta: ChartPicture.default, story: ChartPicture.Failed },
        { name: "PreviewFailure", meta: PreviewFailure.default, story: PreviewFailure.Failed },
        {
          name: "ThumbnailsUnavailable",
          meta: ThumbnailsUnavailable.default,
          story: ThumbnailsUnavailable.SomeFailed,
        },
        { name: "KigurumiInfo", meta: KigurumiInfo.default, story: KigurumiInfo.KigurumiOverParts },
        { name: "CostumeNotes", meta: CostumeNotes.default, story: CostumeNotes.AllAtOnce },
      ]}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every way the app says it waits, failed or has a note, to see the shapes side by side. */
export const SideBySide: Story = { name: "Side by side" };
