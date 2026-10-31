/** The launch cover stands at least this long, so it is seen rather than flashed. */
export const COVER_LEAST_MS = 800;
/** The launch cover stands at most this long, however long the first screen takes. */
export const COVER_MOST_MS = 3_000;
/** Coming back to the app after longer than this in the background shows the cover again. */
export const AWAY_BEFORE_COVER_MS = 5 * 60 * 1_000;

/** When a cover shown at `shownAt` goes, the first screen drawn at `drawnAt`, or not yet. */
export function coverGoesAt(shownAt: number, drawnAt: number | null): number {
  const most = shownAt + COVER_MOST_MS;
  return drawnAt === null ? most : Math.min(most, Math.max(drawnAt, shownAt + COVER_LEAST_MS));
}

/** Whether coming back after `awayMs` in the background shows the cover again. */
export const coversReturn = (awayMs: number): boolean => awayMs > AWAY_BEFORE_COVER_MS;
