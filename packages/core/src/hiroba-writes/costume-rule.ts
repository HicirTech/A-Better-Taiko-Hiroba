import type { CostumeEditorReading } from "../hiroba-dom-parser";
import type { CostumeSet } from "../hiroba-models";
import { err, ok, type Result } from "../operation-results";
import type { InvalidTarget } from "./types";

/** A costume slot: 1 is the きぐるみ, 2 to 5 the pieces (あたま, からだ, メイク, ぷちキャラ). */
export type CostumeSlot = 1 | 2 | 3 | 4 | 5;

/** Each slot's value in the set, slot 1 first. */
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

/**
 * One pick in the editor, by the site's own rule for it (`$.checkCostumes`, mydon.js): a きぐるみ
 * empties the four pieces, and a piece takes the きぐるみ off. 0 empties the slot and nothing else.
 * This is how a draft is made; what the server does with a body is `costumeAfter`.
 */
export function draftCostumeChange(set: CostumeSet, slot: CostumeSlot, id: number): CostumeSet {
  const next: CostumeSet = { ...set, [SLOT_KEY[slot]]: id };
  if (id === 0) {
    return next;
  }
  return slot === 1
    ? { ...next, costume2: 0, costume3: 0, costume4: 0, costume5: 0 }
    : { ...next, costume1: 0 };
}

/**
 * A target checked before anything is sent, against the server's rule and the page's own lists.
 * Refused, naming the field:
 *
 * - a きぐるみ with any piece beside it. The server keeps the きぐるみ and empties the pieces, so the
 *   body moves nothing and still answers 0, success (write #22): the site's client never sends one,
 *   and neither does this;
 * - a colour the palette does not offer;
 * - an item not owned in its slot — the ids the editor lists for that slot, or 0.
 *
 * A value that is already in its place passes as it is: the server holds it already.
 */
export function checkCostumeTarget(
  editor: Pick<CostumeEditorReading, "state" | "palette" | "slots">,
  target: CostumeSet,
): Result<CostumeSet, InvalidTarget> {
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

/**
 * The set the server leaves after storing `body`: the body, except that a きぐるみ empties the four
 * pieces whatever the body said. The one model the four executed costume writes all fit (a colour
 * alone, a きぐるみ, #22 and the restore, #23); colours are never touched by it.
 */
export function costumeAfter(body: CostumeSet): CostumeSet {
  return body.costume1 !== 0
    ? { ...body, costume2: 0, costume3: 0, costume4: 0, costume5: 0 }
    : { ...body };
}

/** Whether two sets hold the same eight values. */
export function sameCostume(left: CostumeSet, right: CostumeSet): boolean {
  return (
    left.colorBody === right.colorBody &&
    left.colorLimb === right.colorLimb &&
    left.colorFace === right.colorFace &&
    COSTUME_SLOT_KEYS.every((key) => left[key] === right[key])
  );
}
