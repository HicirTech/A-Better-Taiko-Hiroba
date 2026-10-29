import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { action } from "storybook/actions";

import { STORY_CAMERA } from "../story-kit/camera";
import { modalLookOf, onDevice, touchOf } from "../story-kit/devices";
import { i18nOf, type StoryGlobals } from "../story-kit/env";
import { type CameraState, ScanWindow } from "./scan-window";

/** The story camera's view once it opens. */
function useStoryCamera(): CameraState {
  const [stream, setStream] = useState<MediaStream | null>(null);
  useEffect(() => {
    let opened: MediaStream | null = null;
    let gone = false;
    void STORY_CAMERA.open().then((seen) => {
      opened = seen;
      if (!gone) {
        setStream(seen);
      }
    });
    return () => {
      gone = true;
      for (const track of opened?.getTracks() ?? []) {
        track.stop();
      }
    };
  }, []);
  return stream === null ? { kind: "starting" } : { kind: "on", stream };
}

function Window({
  camera,
  note = null,
  globals,
}: {
  camera: CameraState;
  note?: string | null;
  globals: StoryGlobals;
}) {
  return (
    <ScanWindow
      open
      camera={camera}
      note={note}
      touchFirst={touchOf(globals)}
      modalLook={modalLookOf(globals)}
      i18n={i18nOf(globals)}
      onText={action("text")}
      onFocusAt={action("focus at")}
      onPicture={action("picture")}
      onClose={action("close")}
    />
  );
}

function WindowOverAGift({ globals }: { globals: StoryGlobals }) {
  return <Window camera={useStoryCamera()} globals={globals} />;
}

const meta = {
  title: "Dialogs/ScanWindow",
  tags: ["scan"],
  parameters: { layout: "fullscreen" },
  globals: onDevice("phone"),
  render: (_args, { globals }) => <WindowOverAGift globals={globals} />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The camera's view over the whole screen, a frame to hold the code in, and the gallery. */
export const LookingAtAGift: Story = {};

export const CameraStarting: Story = {
  render: (_args, { globals }) => <Window camera={{ kind: "starting" }} globals={globals} />,
};

/** No camera, or none allowed: a picture from the gallery is the way left. */
export const NoCamera: Story = {
  render: (_args, { globals }) => <Window camera={{ kind: "off" }} globals={globals} />,
};

/** A picture chosen from the gallery held no code. */
export const NoCodeInThePicture: Story = {
  render: (_args, { globals }) => (
    <Window camera={{ kind: "off" }} note={i18nOf(globals).t("scan.noCode")} globals={globals} />
  ),
};
