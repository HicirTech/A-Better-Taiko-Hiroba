import type { FramePoint } from "./frame-point";

/** A phone's camera, for reading a QR code: its view, or none where there is no camera or leave. */
export interface SystemCamera {
  open(): Promise<MediaStream | null>;
  /** Focuses the camera of `stream` on `point`, where it takes being told. */
  focusAt(stream: MediaStream, point: FramePoint): Promise<void>;
}

/** Lets a camera go: every track of `stream` stopped. */
export function stopStream(stream: MediaStream | null): void {
  for (const track of stream?.getTracks() ?? []) {
    track.stop();
  }
}
