import type { HirobaSessionPort } from "./types";

/** How a shell puts a verb of the port in the queue in front of Hiroba. */
export type VerbQueueing = "read" | "write" | "unqueued";

/**
 * How each verb of the port meets the queue in front of Hiroba, the one place that says so:
 *
 * - `read` waits for every verb asked for before it, so a read never lands between a write's
 *   requests, and the one that has the turn runs alone;
 * - `write` is one turn of the queue, all its requests, and answers `busy` at once, sending
 *   nothing, while another write is queued or running;
 * - `unqueued` is not put there by the shell: the session and the undo list ask Hiroba nothing,
 *   the sign-in is the user's own browser, and a picture queues only the fetch it needs itself, so
 *   one the device keeps answers at once, even while a write runs.
 *
 * A verb with no entry is a type error, so a new verb cannot reach a shell without being placed.
 */
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
} as const satisfies Record<keyof HirobaSessionPort, VerbQueueing>;
