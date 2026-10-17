import type { Meta, StoryObj } from "@storybook/react-vite";

import * as SongListFailed from "../../favorites/song-list-failed.stories";
import * as ThumbnailsUnavailable from "../../my-page/costume-item-grid.thumbnails-unavailable.stories";
import * as CostumeNotes from "../../my-page/costume-notes.stories";
import * as PreviewFailure from "../../my-page/costume-preview-box.preview-failure.stories";
import * as Waiting from "../../my-page/editor-parts.stories";
import * as KigurumiInfo from "../../my-page/kigurumi-info.stories";
import * as WriteOutcomeNotice from "../../my-page/write-outcome.stories";
import * as HoldRing from "../../read-again/long-hold.stories";
import * as PictureLoading from "../../songs/chart-picture.picture-loading.stories";
import * as ChartPicture from "../../songs/chart-picture.stories";
import * as LoadFailed from "../../ui/read-failure-alert.load-failed.stories";
import * as ReadFailureAlert from "../../ui/read-failure-alert.stories";
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
        { name: "Waiting", meta: Waiting.default, story: Waiting.Saving },
        { name: "HoldRing", meta: HoldRing.default, story: HoldRing.Filling },
        { name: "PictureLoading", meta: PictureLoading.default, story: PictureLoading.Loading },
        { name: "LoadFailed", meta: LoadFailed.default, story: LoadFailed.WithCodes },
        { name: "SongListFailed", meta: SongListFailed.default, story: SongListFailed.Failed },
        { name: "ChartPicture", meta: ChartPicture.default, story: ChartPicture.Failed },
        { name: "PreviewFailure", meta: PreviewFailure.default, story: PreviewFailure.Failed },
        {
          name: "ThumbnailsUnavailable",
          meta: ThumbnailsUnavailable.default,
          story: ThumbnailsUnavailable.SomeFailed,
        },
        {
          name: "WriteOutcomeNotice",
          meta: WriteOutcomeNotice.default,
          story: WriteOutcomeNotice.WithComparison,
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
