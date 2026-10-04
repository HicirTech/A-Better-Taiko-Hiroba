// The update reminder's logic that needs no window, so the main process and the Android shell use it.
export { readUpdateFeed } from "./read-update-feed";
export {
  isVersion,
  MAX_FEED_LENGTH,
  parseUpdateFeed,
  type UpdateFeed,
  type UpdateFeedFailure,
  type UpdateNotes,
} from "./update-feed";
export { feedUrlFor, RELEASES_URL, UPDATE_FEED_URL } from "./update-links";
