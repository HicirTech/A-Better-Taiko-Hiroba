import type { ScoreRank } from "@abth/core";

import type {
  CostumeSet,
  CrownKind,
  HirobaSessionPort,
  NameState,
  PictureWant,
  TitleState,
  TitleTarget,
} from "./types";

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

/** The interface picks a title by id and name. */
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

export const isWhole = (value: unknown, least: number, most: number): value is number =>
  Number.isInteger(value) && (value as number) >= least && (value as number) <= most;

const KIND_ONLY_PICTURES: readonly string[] = ["titlePlate", "scorePanel", "medalPlate", "myDon"];
// Records, so a rank or crown the app gains is a type error here until its icon may be asked for.
const RANK_ICONS: Readonly<Record<ScoreRank, true>> = {
  2: true,
  3: true,
  4: true,
  5: true,
  6: true,
  7: true,
  8: true,
};
const CROWN_ICONS: Readonly<Record<CrownKind, true>> = {
  silver: true,
  gold: true,
  donderful: true,
};

/** A picture the interface may ask for, and nothing else: no URL, no source, no other key. はずす (0)
 * has no picture, so an item's id starts at 1. */
export function isPictureWant(value: unknown): value is PictureWant {
  if (hasExactly(value, ["kind"])) {
    return typeof value.kind === "string" && KIND_ONLY_PICTURES.includes(value.kind);
  }
  if (hasExactly(value, ["kind", "rank"])) {
    return (
      value.kind === "rankIcon" &&
      typeof value.rank === "number" &&
      Object.hasOwn(RANK_ICONS, value.rank)
    );
  }
  if (hasExactly(value, ["kind", "crown"])) {
    return (
      value.kind === "crownIcon" &&
      typeof value.crown === "string" &&
      Object.hasOwn(CROWN_ICONS, value.crown)
    );
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
  costumeHistory: none,
} as const satisfies Record<keyof HirobaSessionPort, ArgumentCheck>;
