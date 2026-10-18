import type { Meta, StoryObj } from "@storybook/react-vite";

import * as OpenButton from "../../my-page/open-button.stories";
import * as ControlWithSave from "../../name-title/control-with-save.stories";
import * as ReadAgainFoot from "../../read-again/read-again-foot.stories";
import * as PictureButton from "../../songs/chart-picture.picture-button.stories";
import * as SyncBar from "../../ui/sync-bar.stories";
import { Gallery } from "../gallery";

const meta = {
  title: "Buttons/Side by side",
  tags: ["gallery"],
  parameters: { layout: "fullscreen" },
  render: (_args, context) => (
    <Gallery
      context={context}
      members={[
        { name: "OpenButton", meta: OpenButton.default, story: OpenButton.OpensAPage },
        { name: "PictureButton", meta: PictureButton.default, story: PictureButton.Picture },
        { name: "ReadAgainFoot", meta: ReadAgainFoot.default, story: ReadAgainFoot.LastUpdated },
        { name: "ControlWithSave", meta: ControlWithSave.default, story: ControlWithSave.OneRow },
        { name: "SyncBar", meta: SyncBar.default, story: SyncBar.WithHistory, wide: true },
      ]}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The app's own buttons: pictures that open things, Read again, and Save beside a field. */
export const SideBySide: Story = { name: "Side by side" };
