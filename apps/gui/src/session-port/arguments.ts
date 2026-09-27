import type { CostumeSet, HirobaSessionPort } from "./types";

/** Whether one verb's arguments, as they arrived from the interface, are ones it takes. */
export type ArgumentCheck = (args: readonly unknown[]) => boolean;

/** A verb that takes nothing takes nothing: an extra argument is refused, not ignored. */
const none: ArgumentCheck = (args) => args.length === 0;

/** The eight values of a costume set, and the most any of them may be. */
const COSTUME_KEYS: readonly (keyof CostumeSet)[] = [
  "colorBody",
  "colorLimb",
  "colorFace",
  "costume1",
  "costume2",
  "costume3",
  "costume4",
  "costume5",
];
/** Far above any id seen (colours 0–62, items to the low hundreds), and still a bound. */
const MAX_COSTUME_VALUE = 9999;

/** A plain object with exactly these keys, and nothing inherited or extra. */
function hasExactly(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    return false;
  }
  const own = Object.keys(value);
  return own.length === keys.length && keys.every((key) => own.includes(key));
}

function isCostumeSet(value: unknown): boolean {
  return (
    hasExactly(value, COSTUME_KEYS) &&
    COSTUME_KEYS.every((key) => {
      const one = value[key];
      return Number.isInteger(one) && (one as number) >= 0 && (one as number) <= MAX_COSTUME_VALUE;
    })
  );
}

/** changeCostume: one argument, the set expected and the set wanted, eight whole numbers each. */
const costumeChange: ArgumentCheck = (args) =>
  args.length === 1 &&
  hasExactly(args[0], ["expected", "target"]) &&
  isCostumeSet(args[0].expected) &&
  isCostumeSet(args[0].target);

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
  enabledWrites: none,
  openCostumeEditor: none,
  changeCostume: costumeChange,
} as const satisfies Record<keyof HirobaSessionPort, ArgumentCheck>;
