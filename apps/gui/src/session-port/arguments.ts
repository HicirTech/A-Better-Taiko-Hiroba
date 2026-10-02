import type {
  CostumeSet,
  HirobaSessionPort,
  NameState,
  PictureWant,
  TitleState,
  TitleTarget,
  WriteKind,
  WriteSets,
} from "./types";

/** Every kind of write the app can send. */
export const WRITE_KINDS: readonly WriteKind[] = ["costume", "title", "name"];

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

/** The longest title the interface may send or a slot keep: far above the longest seen. */
const MAX_TITLE_LENGTH = 200;
/** Far above any id the title page's list has given (3 to 1672), and still a bound. */
const MAX_TITLE_ID = 9999;

/** Exactly `{ title }`, a string of at most 200 characters: no title is the empty string. */
export function isTitleState(value: unknown): value is TitleState {
  return (
    hasExactly(value, ["title"]) &&
    typeof value.title === "string" &&
    value.title.length <= MAX_TITLE_LENGTH
  );
}

/**
 * Exactly `{ id, title }`: the id the title page's list gave, a whole number from 1 to 9999, and
 * the name it gave that id, 1 to 200 characters. The interface picks a title by its id; a title by
 * its name alone (`id` null) is how the platform puts one back, and never crosses the port.
 */
export function isTitleTarget(value: unknown): value is TitleTarget {
  return (
    hasExactly(value, ["id", "title"]) &&
    isWhole(value.id, 1, MAX_TITLE_ID) &&
    typeof value.title === "string" &&
    value.title.length >= 1 &&
    value.title.length <= MAX_TITLE_LENGTH
  );
}

/** The longest name the interface may send or a slot keep: far above the form's ten. */
const MAX_NAME_LENGTH = 64;

/**
 * Exactly `{ nickname }`, a string of 1 to 64 characters: Hiroba's form takes ten, and the core
 * refuses what the form it reads would not. A name is never empty: my page does not read as one.
 */
export function isNameState(value: unknown): value is NameState {
  return (
    hasExactly(value, ["nickname"]) &&
    typeof value.nickname === "string" &&
    value.nickname.length >= 1 &&
    value.nickname.length <= MAX_NAME_LENGTH
  );
}

/**
 * How each kind's set is recognised when an undo slot is read back from storage: the check the
 * interface's arguments go through, so a slot kept is held to the shape a write is.
 */
export const UNDO_SET_GUARDS: {
  readonly [K in WriteKind]: (value: unknown) => value is WriteSets[K];
} = { costume: isCostumeSet, title: isTitleState, name: isNameState };

/** A whole number from `least` to `most`. */
export const isWhole = (value: unknown, least: number, most: number): value is number =>
  Number.isInteger(value) && (value as number) >= least && (value as number) <= most;

/** The kinds of picture that name nothing but their kind: the platform knows which one it means. */
const KIND_ONLY_PICTURES: readonly string[] = ["titlePlate", "scorePanel", "medalPlate", "myDon"];

/**
 * A picture the interface may ask for, and nothing else: a kind, and for an item's thumbnail its
 * slot, 1 to 5, and its id, 1 to 9999; for a picture of my page, the kind alone. No URL, no source
 * and no other key: the platform builds the address. はずす (0) has no picture.
 */
export function isPictureWant(value: unknown): value is PictureWant {
  if (hasExactly(value, ["kind"])) {
    return typeof value.kind === "string" && KIND_ONLY_PICTURES.includes(value.kind);
  }
  return (
    hasExactly(value, ["kind", "slot", "id"]) &&
    value.kind === "costumeItem" &&
    isWhole(value.slot, 1, 5) &&
    isWhole(value.id, 1, MAX_COSTUME_VALUE)
  );
}

/** readPicture: one argument, a picture the interface may ask for. */
const pictureWant: ArgumentCheck = (args) => args.length === 1 && isPictureWant(args[0]);

/**
 * readProfile: nothing, a plain read; or one argument, `{ renewsPortrait }` with a boolean, and no
 * other key.
 */
const profileRead: ArgumentCheck = (args) =>
  args.length === 0 ||
  (args.length === 1 &&
    hasExactly(args[0], ["renewsPortrait"]) &&
    typeof args[0].renewsPortrait === "boolean");

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

/** changeTitle: one argument, the title worn as read and the title wanted, by its id and name. */
const titleChange: ArgumentCheck = (args) =>
  args.length === 1 &&
  hasExactly(args[0], ["expected", "target"]) &&
  isTitleState(args[0].expected) &&
  isTitleTarget(args[0].target);

/** changeName: one argument, the name as read and the name wanted. */
const nameChange: ArgumentCheck = (args) =>
  args.length === 1 &&
  hasExactly(args[0], ["expected", "target"]) &&
  isNameState(args[0].expected) &&
  isNameState(args[0].target);

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
  readProfile: profileRead,
  signOut: none,
  openCostumeEditor: none,
  openTitleEditor: none,
  previewCostume: costumeSet,
  readPicture: pictureWant,
  changeCostume: costumeChange,
  changeTitle: titleChange,
  changeName: nameChange,
  pendingUndo: none,
  undo: writeKind,
} as const satisfies Record<keyof HirobaSessionPort, ArgumentCheck>;
