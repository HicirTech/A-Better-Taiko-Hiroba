import type { FramePoint } from "./frame-point";
import { type SystemCamera, stopStream } from "./system-camera";

/** Sharp enough for a code across part of the view; the camera gives its nearest size. */
const WANTED: MediaTrackConstraints = { width: { ideal: 1920 }, height: { ideal: 1080 } };
/** How long a tap's focus runs before the camera goes back to focusing on its own there. */
const TAP_FOCUS_MS = 1200;
/** A back camera, as Android's WebView names one: "camera2 0, facing back". */
const BACK = /back|environment|rear/i;

// What Android's WebView reads and takes of focus, beyond TypeScript's DOM types.
type Focusing = MediaTrackConstraintSet & {
  readonly focusMode?: string;
  readonly pointsOfInterest?: readonly FramePoint[];
};

const focusModesOf = (stream: MediaStream | null): readonly string[] => {
  const [track] = stream?.getVideoTracks() ?? [];
  const capabilities = track?.getCapabilities?.() as { focusMode?: readonly string[] } | undefined;
  return capabilities?.focusMode ?? [];
};

const focusing = (stream: MediaStream, set: Focusing) =>
  Promise.all(
    stream.getVideoTracks().map((track) => track.applyConstraints({ advanced: [set] })),
  ).catch(() => undefined);

async function opened(video: MediaTrackConstraints): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio: false });
  } catch {
    return null;
  }
}

/** `first`, or another back camera that focuses where `first` cannot, such as a fixed wide one. */
async function cameraThatFocuses(first: MediaStream): Promise<MediaStream | null> {
  if (focusModesOf(first).includes("continuous")) {
    return first;
  }

  const firstId = first.getVideoTracks()[0]?.getSettings().deviceId;
  const others = (await navigator.mediaDevices.enumerateDevices()).filter(
    (device) =>
      device.kind === "videoinput" && device.deviceId !== firstId && BACK.test(device.label),
  );
  if (others.length === 0) {
    return first;
  }

  // A phone opens one camera at a time.
  stopStream(first);
  for (const device of others) {
    const other = await opened({ ...WANTED, deviceId: { exact: device.deviceId } });
    if (focusModesOf(other).includes("continuous")) {
      return other;
    }
    stopStream(other);
  }
  return opened(
    firstId === undefined
      ? { ...WANTED, facingMode: { ideal: "environment" } }
      : { ...WANTED, deviceId: { exact: firstId } },
  );
}

/** The back camera through the WebView, which asks the player's leave the first time. */
export const androidCamera: SystemCamera = {
  async open() {
    const first = await opened({ ...WANTED, facingMode: { ideal: "environment" } });
    const stream = first === null ? null : await cameraThatFocuses(first);
    if (stream !== null && focusModesOf(stream).includes("continuous")) {
      await focusing(stream, { focusMode: "continuous" });
    }
    return stream;
  },
  async focusAt(stream, point) {
    const modes = focusModesOf(stream);
    const at = { pointsOfInterest: [point] };
    if (modes.includes("single-shot")) {
      await focusing(stream, { ...at, focusMode: "single-shot" });
      await new Promise((settled) => setTimeout(settled, TAP_FOCUS_MS));
    }
    if (modes.includes("continuous")) {
      await focusing(stream, { ...at, focusMode: "continuous" });
    }
  },
};
