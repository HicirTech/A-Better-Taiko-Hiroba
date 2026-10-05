export interface Point {
  readonly x: number;
  readonly y: number;
}

/** How much a picture is enlarged from its fitted size, and how far it is moved. */
export interface ZoomView {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export const FITTED: ZoomView = { scale: 1, x: 0, y: 0 };
export const MAX_ZOOM = 6;

/** The view at `scale` that keeps the picture's point under `from`, in `start`, under `to`. */
export function zoomedView(start: ZoomView, scale: number, from: Point, to: Point): ZoomView {
  const next = Math.min(Math.max(scale, 1), MAX_ZOOM);
  if (next === 1) {
    return FITTED;
  }

  const pictureX = (from.x - start.x) / start.scale;
  const pictureY = (from.y - start.y) / start.scale;
  return { scale: next, x: to.x - pictureX * next, y: to.y - pictureY * next };
}

export const distanceOf = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export const midpointOf = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});
