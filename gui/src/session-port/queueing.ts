import type { Transport } from "@abth/core";

import type { HirobaSessionPort } from "./types";

/** How a verb runs: `read` beside others, `exclusive` or `write` alone, `external` elsewhere. */
export type VerbQueueing = "read" | "exclusive" | "write" | "external" | "unqueued";

/** `unqueued` verbs ask nothing, or put their own fetches in a pipeline (pictures, charts). */
export const PORT_QUEUEING = {
  isSignedIn: "unqueued",
  signIn: "unqueued",
  cancelSignIn: "unqueued",
  readProfile: "read",
  refreshHiroba: "exclusive",
  signOut: "unqueued",
  openCostumeEditor: "read",
  openTitleEditor: "read",
  previewCostume: "read",
  readPicture: "unqueued",
  changeCostume: "write",
  changeTitle: "write",
  changeName: "write",
  costumeHistory: "unqueued",
  readUpdateFeed: "external",
  openFavorites: "read",
  changeFolder: "write",
  changeFavoriteSong: "write",
  readSongPicker: "exclusive",
  readSongCatalogue: "external",
  readChineseNames: "external",
  readChartPicture: "unqueued",
  readPipelines: "unqueued",
} as const satisfies Record<keyof HirobaSessionPort, VerbQueueing>;

/** The verbs the table puts in the way `How` says: what a test of that way must cover. */
export type VerbsQueued<How extends VerbQueueing> = {
  [V in keyof typeof PORT_QUEUEING]: (typeof PORT_QUEUEING)[V] extends How ? V : never;
}[keyof typeof PORT_QUEUEING];

/** A verb as a shell writes it: one in a pipeline sends through its own group's transport. */
export type VerbImplementation<V extends keyof HirobaSessionPort> =
  (typeof PORT_QUEUEING)[V] extends "unqueued"
    ? HirobaSessionPort[V]
    : (
        transport: Transport,
        ...args: Parameters<HirobaSessionPort[V]>
      ) => ReturnType<HirobaSessionPort[V]>;

/** A shell's verbs before `queuePort` puts each in its pipeline. */
export type PortImplementation = {
  readonly [V in keyof HirobaSessionPort]: VerbImplementation<V>;
};
