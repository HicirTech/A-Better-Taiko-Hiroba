/** The launch cover stands at least this long, so it is seen rather than flashed. */
export const COVER_LEAST_MS = 800;
/** The launch cover stands at most this long, however long the first screen takes. */
export const COVER_MOST_MS = 3_000;

/** When a cover shown at `shownAt` goes, the first screen drawn at `drawnAt`, or not yet. */
export function coverGoesAt(shownAt: number, drawnAt: number | null): number {
  const most = shownAt + COVER_MOST_MS;
  return drawnAt === null ? most : Math.min(most, Math.max(drawnAt, shownAt + COVER_LEAST_MS));
}
