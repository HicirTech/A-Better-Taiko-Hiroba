/** The repository's releases page, which is also the root of every address the app opens. */
export const RELEASES_URL = "https://github.com/HicirTech/A-Better-Taiko-Hiroba/releases";

// GitHub sends this on to the latest release's asset: no API, no rate limit.
export const UPDATE_FEED_URL = `${RELEASES_URL}/latest/download/update.json`;

/** Where the feed is read: the real one, or in a development run only what it names, else nothing. */
export function feedUrlFor(development: boolean, override: string | undefined): string | undefined {
  return development ? override || undefined : UPDATE_FEED_URL;
}
