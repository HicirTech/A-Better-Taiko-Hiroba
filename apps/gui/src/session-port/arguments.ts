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

export const WRITE_KINDS: readonly WriteKind[] = ["costume", "title", "name"];

/** Whether one verb's arguments, as they arrived from the interface, are ones it takes. */
export type ArgumentCheck = (args: readonly unknown[]) => boolean;

/** A verb that takes nothing takes nothing: an extra argument is refused, not ignored. */
const none: ArgumentCheck = (args) => args.length === 0;

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
// The limits here sit far above any value seen, and are still limits.
const MAX_COSTUME_VALUE = 9999;

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

export function isCostumeSet(value: unknown): value is CostumeSet {
  return (
    hasExactly(value, COSTUME_KEYS) &&
    COSTUME_KEYS.every((key) => {
      const one = value[key];
      return Number.isInteger(one) && (one as number) >= 0 && (one as number) <= MAX_COSTUME_VALUE;
    })
  );
}

const MAX_TITLE_LENGTH = 200;
const MAX_TITLE_ID = 9999;

/** Exactly `{ title }`; the empty string is a valid title and means none. */
export function isTitleState(value: unknown): value is TitleState {
  return (
    hasExactly(value, ["title"]) &&
    typeof value.title === "string" &&
    value.title.length <= MAX_TITLE_LENGTH
  );
}

/** The interface picks a title by id and name; a title by name alone (`id` null) is how the
 * platform puts one back, and never crosses the port. */
export function isTitleTarget(value: unknown): value is TitleTarget {
  return (
    hasExactly(value, ["id", "title"]) &&
    isWhole(value.id, 1, MAX_TITLE_ID) &&
    typeof value.title === "string" &&
    value.title.length >= 1 &&
    value.title.length <= MAX_TITLE_LENGTH
  );
}

const MAX_NAME_LENGTH = 64;

/** Hiroba's form takes ten characters; the core refuses what the form it reads would not. A name
 * is never empty: my page does not read as one. */
export function isNameState(value: unknown): value is NameState {
  return (
    hasExactly(value, ["nickname"]) &&
    typeof value.nickname === "string" &&
    value.nickname.length >= 1 &&
    value.nickname.length <= MAX_NAME_LENGTH
  );
}

/** The checks the interface's arguments go through, so a stored slot meets a write's shape. */
export const UNDO_SET_GUARDS: {
  readonly [K in WriteKind]: (value: unknown) => value is WriteSets[K];
} = { costume: isCostumeSet, title: isTitleState, name: isNameState };

export const isWhole = (value: unknown, least: number, most: number): value is number =>
  Number.isInteger(value) && (value as number) >= least && (value as number) <= most;

const KIND_ONLY_PICTURES: readonly string[] = ["titlePlate", "scorePanel", "medalPlate", "myDon"];

/** A picture the interface may ask for, and nothing else: no URL, no source, no other key. はずす (0)
 * has no picture, so an item's id starts at 1. */
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

const pictureWant: ArgumentCheck = (args) => args.length === 1 && isPictureWant(args[0]);

const profileRead: ArgumentCheck = (args) =>
  args.length === 0 ||
  (args.length === 1 &&
    hasExactly(args[0], ["renewsPortrait"]) &&
    typeof args[0].renewsPortrait === "boolean");

const costumeChange: ArgumentCheck = (args) =>
  args.length === 1 &&
  hasExactly(args[0], ["expected", "target"]) &&
  isCostumeSet(args[0].expected) &&
  isCostumeSet(args[0].target);

// previewCostume's set becomes the picture's query, so nothing but its numbers can reach it.
const costumeSet: ArgumentCheck = (args) => args.length === 1 && isCostumeSet(args[0]);

const titleChange: ArgumentCheck = (args) =>
  args.length === 1 &&
  hasExactly(args[0], ["expected", "target"]) &&
  isTitleState(args[0].expected) &&
  isTitleTarget(args[0].target);

const nameChange: ArgumentCheck = (args) =>
  args.length === 1 &&
  hasExactly(args[0], ["expected", "target"]) &&
  isNameState(args[0].expected) &&
  isNameState(args[0].target);

const writeKind: ArgumentCheck = (args) =>
  args.length === 1 && WRITE_KINDS.includes(args[0] as WriteKind);

/** What each verb accepts from the interface; anything the renderer sends is untrusted until it
 * passes here. A verb with no entry is a type error, so none reaches the port unchecked. */
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
