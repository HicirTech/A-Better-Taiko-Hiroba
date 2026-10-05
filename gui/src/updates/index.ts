// The reminder's logic that needs no window, so the main process and the Android shell share it.
export { readUpdateFeed } from "./read-update-feed";
export {
  isNewer,
  isVersion,
  MAX_FEED_LENGTH,
  notesFor,
  parseUpdateFeed,
  type UpdateFeed,
  type UpdateFeedFailure,
  type UpdateNotes,
} from "./update-feed";
export {
  feedUrlFor,
  openableUrlOf,
  RELEASES_URL,
  REPOSITORY_NAME,
  REPOSITORY_URL,
  releaseUrl,
  UPDATE_FEED_URL,
} from "./update-links";
