/** A point on the camera's frame, from 0 to 1 across and down. */
export interface FramePoint {
  readonly x: number;
  readonly y: number;
}

interface Size {
  readonly width: number;
  readonly height: number;
}

/** Where a tap at `at` in a view of `view` falls on a `frame` that covers it, cut to fit. */
export function framePointOf(at: FramePoint, view: Size, frame: Size): FramePoint {
  const scale = Math.max(view.width / frame.width, view.height / frame.height);
  const shown = { width: frame.width * scale, height: frame.height * scale };
  const clamped = (value: number) => Math.min(1, Math.max(0, value));
  return {
    x: clamped((at.x + (shown.width - view.width) / 2) / shown.width),
    y: clamped((at.y + (shown.height - view.height) / 2) / shown.height),
  };
}
