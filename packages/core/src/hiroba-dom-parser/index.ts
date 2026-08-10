/**
 * The parsing foundation every page parser goes through.
 *
 * Hiroba answers a logged-out request with its login page and HTTP 200, so "am I looking at the
 * page I think I am" is a question every parser has to ask before reading fields. This domain
 * answers it once: parsePage() refuses a login page as its own named failure instead of letting
 * it surface as a dozen missing fields, and requireMarker() turns an absent element into a
 * failure naming the page and the selector, so a broken parse says where to look.
 */
export { parseCostumePage } from "./costume-page";
export { parsePage, requireMarker } from "./parser";
export { parseProfilePage } from "./profile-page";
export { parseDanBoardPage, parseDanDetailPage } from "./dan-pages";
export { parsePlayerRowsPage } from "./player-rows";
export { parsePublicProfilePage } from "./public-profile-page";
export { parseRecentPlaysPage, scoreFromRecentPlay } from "./recent-plays-page";
export { parseScoreDetailPage } from "./score-detail-page";
export { parseScoreListPage } from "./score-list-page";
export type {
  LoggedOutFailure,
  MissingMarkerFailure,
  ParseFailure,
  PlayerListReading,
  PlayerRow,
  PlayerRowDan,
  RecentPlay,
  DanBoardPanel,
  DanBoardReading,
  ScoreListReading,
  SiteErrorFailure,
  UnreadableValueFailure,
  WrongPageFailure,
} from "./types";
