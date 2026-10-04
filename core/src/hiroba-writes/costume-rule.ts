import type { CostumeEditorReading } from "../hiroba-dom-parser";
import type { CostumeSet } from "../hiroba-models";
import { err, ok, type Result } from "../operation-results";
import type { InvalidTarget } from "./types";

/** A costume slot: 1 is the きぐるみ, 2 to 5 the pieces (あたま, からだ, メイク, ぷちキャラ). */
export type CostumeSlot = 1 | 2 | 3 | 4 | 5;

export const COSTUME_SLOT_KEYS = [
  "costume1",
  "costume2",
  "costume3",
  "costume4",
  "costume5",
] as const satisfies readonly (keyof CostumeSet)[];

const SLOT_KEY: Readonly<Record<CostumeSlot, (typeof COSTUME_SLOT_KEYS)[number]>> = {
  1: "costume1",
  2: "costume2",
  3: "costume3",
  4: "costume4",
  5: "costume5",
};

const PIECE_KEYS = ["costume2", "costume3", "costume4", "costume5"] as const;
const COLOUR_KEYS = ["colorBody", "colorLimb", "colorFace"] as const;

/** One pick by the site's `$.checkCostumes` rule: a きぐるみ empties the pieces, a piece the きぐるみ. */
export function draftCostumeChange(set: CostumeSet, slot: CostumeSlot, id: number): CostumeSet {
  const next: CostumeSet = { ...set, [SLOT_KEY[slot]]: id };
  if (id === 0) {
    return next;
  }
  return slot === 1
    ? { ...next, costume2: 0, costume3: 0, costume4: 0, costume5: 0 }
    : { ...next, costume1: 0 };
}

/** Checks a target against the server's rule and the page's lists, naming the field it refuses. */
export function checkCostumeTarget(
  editor: Pick<CostumeEditorReading, "state" | "palette" | "slots">,
  target: CostumeSet,
): Result<CostumeSet, InvalidTarget> {
  // The server would keep the きぐるみ, empty the pieces and still answer success: never send it.
  if (target.costume1 !== 0 && PIECE_KEYS.some((key) => target[key] !== 0)) {
    return err({ field: "costume1" });
  }
  for (const key of COLOUR_KEYS) {
    const colour = target[key];
    if (colour !== editor.state[key] && !editor.palette.some((swatch) => swatch.id === colour)) {
      return err({ field: key });
    }
  }
  for (const [index, key] of COSTUME_SLOT_KEYS.entries()) {
    const id = target[key];
    const owned = editor.slots[index] ?? [];
    if (id !== 0 && id !== editor.state[key] && !owned.includes(id)) {
      return err({ field: key });
    }
  }
  return ok({ ...target });
}

/** What the server leaves after storing `body`: a きぐるみ empties the four pieces regardless. */
export function costumeAfter(body: CostumeSet): CostumeSet {
  return body.costume1 !== 0
    ? { ...body, costume2: 0, costume3: 0, costume4: 0, costume5: 0 }
    : { ...body };
}

export function sameCostume(left: CostumeSet, right: CostumeSet): boolean {
  return (
    left.colorBody === right.colorBody &&
    left.colorLimb === right.colorLimb &&
    left.colorFace === right.colorFace &&
    COSTUME_SLOT_KEYS.every((key) => left[key] === right[key])
  );
}
