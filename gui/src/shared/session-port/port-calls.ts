import type { HirobaSessionPort } from "./types";

/** How a verb runs: `read` beside others, `exclusive` or `write` alone, `external` elsewhere. */
export type VerbQueueing = "read" | "exclusive" | "write" | "external" | "unqueued";

/** What the preload, the main process and the queue know of one call of the port. */
interface PortCall<V extends keyof HirobaSessionPort> {
  readonly channel: string;
  // `unqueued` verbs ask nothing, or put their own fetches in a pipeline (pictures, charts).
  readonly queueing: VerbQueueing;
  // The preload sends this many and no more: a call used as a click handler gets the click.
  readonly takes: Required<Parameters<HirobaSessionPort[V]>>["length"];
}

/** Each call's channel, queueing and number of arguments: data alone, as the preload loads it. */
export const PORT_CALLS = {
  isSignedIn: { channel: "abth:is-signed-in", queueing: "unqueued", takes: 0 },
  signIn: { channel: "abth:sign-in", queueing: "unqueued", takes: 0 },
  cancelSignIn: { channel: "abth:cancel-sign-in", queueing: "unqueued", takes: 0 },
  readProfile: { channel: "abth:read-profile", queueing: "read", takes: 1 },
  refreshHiroba: { channel: "abth:refresh-hiroba", queueing: "exclusive", takes: 0 },
  signOut: { channel: "abth:sign-out", queueing: "unqueued", takes: 0 },
  openCostumeEditor: { channel: "abth:open-costume-editor", queueing: "read", takes: 0 },
  openTitleEditor: { channel: "abth:open-title-editor", queueing: "read", takes: 0 },
  previewCostume: { channel: "abth:preview-costume", queueing: "read", takes: 1 },
  readPicture: { channel: "abth:read-picture", queueing: "unqueued", takes: 2 },
  changeCostume: { channel: "abth:change-costume", queueing: "write", takes: 1 },
  changeTitle: { channel: "abth:change-title", queueing: "write", takes: 1 },
  changeName: { channel: "abth:change-name", queueing: "write", takes: 1 },
  costumeHistory: { channel: "abth:costume-history", queueing: "unqueued", takes: 0 },
  readUpdateFeed: { channel: "abth:read-update-feed", queueing: "external", takes: 0 },
  openFavorites: { channel: "abth:open-favorites", queueing: "read", takes: 0 },
  changeFolder: { channel: "abth:change-folder", queueing: "write", takes: 1 },
  changeFavoriteSong: { channel: "abth:change-favorite-song", queueing: "write", takes: 1 },
  folderHistory: { channel: "abth:folder-history", queueing: "unqueued", takes: 0 },
  readSongPicker: { channel: "abth:read-song-picker", queueing: "exclusive", takes: 0 },
  scores: { channel: "abth:scores", queueing: "unqueued", takes: 0 },
  listedCharts: { channel: "abth:listed-charts", queueing: "unqueued", takes: 0 },
  readScores: { channel: "abth:read-scores", queueing: "unqueued", takes: 0 },
  readEveryScore: { channel: "abth:read-every-score", queueing: "unqueued", takes: 0 },
  readSongScores: { channel: "abth:read-song-scores", queueing: "unqueued", takes: 2 },
  scoresProgress: { channel: "abth:scores-progress", queueing: "unqueued", takes: 0 },
  readSongCatalogue: { channel: "abth:read-song-catalogue", queueing: "external", takes: 1 },
  readChineseNames: { channel: "abth:read-chinese-names", queueing: "external", takes: 0 },
  readRatingData: { channel: "abth:read-rating-data", queueing: "external", takes: 1 },
  ratingHistory: { channel: "abth:rating-history", queueing: "unqueued", takes: 1 },
  keepRating: { channel: "abth:keep-rating", queueing: "unqueued", takes: 2 },
  readChartPicture: { channel: "abth:read-chart-picture", queueing: "unqueued", takes: 2 },
  readCdnChart: { channel: "abth:read-cdn-chart", queueing: "unqueued", takes: 3 },
  readChartDensity: { channel: "abth:read-chart-density", queueing: "unqueued", takes: 2 },
  readChartTja: { channel: "abth:read-chart-tja", queueing: "unqueued", takes: 1 },
  readDrawnChart: { channel: "abth:read-drawn-chart", queueing: "unqueued", takes: 2 },
  keepDrawnChart: { channel: "abth:keep-drawn-chart", queueing: "unqueued", takes: 3 },
  readPipelines: { channel: "abth:read-pipelines", queueing: "unqueued", takes: 1 },
} as const satisfies { readonly [V in keyof HirobaSessionPort]: PortCall<V> };
