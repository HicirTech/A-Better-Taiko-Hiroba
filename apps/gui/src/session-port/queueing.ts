import type { HirobaSessionPort } from "./types";

/** `read` waits for every verb before it; `write` is a whole turn and answers `busy` at once while
 * another runs; `unqueued` asks Hiroba nothing, or queues only the fetch it needs (a picture). */
export type VerbQueueing = "read" | "write" | "unqueued";

export const PORT_QUEUEING = {
  isSignedIn: "unqueued",
  signIn: "unqueued",
  cancelSignIn: "unqueued",
  readProfile: "read",
  signOut: "unqueued",
  openCostumeEditor: "read",
  openTitleEditor: "read",
  previewCostume: "read",
  readPicture: "unqueued",
  changeCostume: "write",
  changeTitle: "write",
  changeName: "write",
  pendingUndo: "unqueued",
  undo: "write",
  costumeHistory: "unqueued",
} as const satisfies Record<keyof HirobaSessionPort, VerbQueueing>;

/** The verbs the table puts in the way `How` says: what a test of that way must cover. */
export type VerbsQueued<How extends VerbQueueing> = {
  [V in keyof typeof PORT_QUEUEING]: (typeof PORT_QUEUEING)[V] extends How ? V : never;
}[keyof typeof PORT_QUEUEING];
