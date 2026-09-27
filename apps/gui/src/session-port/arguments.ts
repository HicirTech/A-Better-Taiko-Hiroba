import type { CostumeSet, HirobaSessionPort, WriteKind } from "./types";

/** Every kind of write the app can send, whether or not a run may send it. */
export const WRITE_KINDS: readonly WriteKind[] = ["costume"];

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

/** Eight whole numbers from 0 to 9999, under a costume set's own keys and no others. */
export function isCostumeSet(value: unknown): value is CostumeSet {
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
 * previewCostume: one argument, a set of eight whole numbers. They become the picture's query, so
 * nothing but those numbers can reach it.
 */
const costumeSet: ArgumentCheck = (args) => args.length === 1 && isCostumeSet(args[0]);

/** undo: one argument, a kind of write the app knows. */
const writeKind: ArgumentCheck = (args) =>
  args.length === 1 && WRITE_KINDS.includes(args[0] as WriteKind);

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
  previewCostume: costumeSet,
  changeCostume: costumeChange,
  pendingUndo: none,
  undo: writeKind,
} as const satisfies Record<keyof HirobaSessionPort, ArgumentCheck>;
