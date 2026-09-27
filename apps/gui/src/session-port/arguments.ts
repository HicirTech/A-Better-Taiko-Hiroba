import type { HirobaSessionPort } from "./types";

/** Whether one verb's arguments, as they arrived from the interface, are ones it takes. */
export type ArgumentCheck = (args: readonly unknown[]) => boolean;

/** A verb that takes nothing takes nothing: an extra argument is refused, not ignored. */
const none: ArgumentCheck = (args) => args.length === 0;

/**
 * What each verb of the port accepts from the interface, checked where the interface's call
 * arrives — on the desktop, in the main process, after the frame it came from is checked and before
 * the verb runs. Anything the renderer sends is untrusted until it passes here. A verb with no
 * entry is a type error, so a new verb cannot reach the port unchecked.
 */
export const PORT_ARGUMENTS = {
  isSignedIn: none,
  signIn: none,
  cancelSignIn: none,
  readProfile: none,
  signOut: none,
} as const satisfies Record<keyof HirobaSessionPort, ArgumentCheck>;
