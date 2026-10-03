import { describe, expect, test } from "bun:test";
import { createTranslator } from "@abth/i18n";

import {
  COLOUR_PARTS,
  type CostumePart,
  isSlotPart,
  itemsOf,
  PART_LABEL,
  SLOT_PARTS,
  tileName,
} from "../src/my-page/costume-parts";
import type { CostumeEditorView, CostumeSet } from "../src/session-port";

const WEARING: CostumeSet = {
  colorBody: 12,
  colorLimb: 13,
  colorFace: 5,
  costume1: 0,
  costume2: 21,
  costume3: 68,
  costume4: 37,
  costume5: 140,
};

const editorOf = (
  slots: readonly (readonly number[])[],
  state: Partial<CostumeSet> = {},
): CostumeEditorView => ({ state: { ...WEARING, ...state }, palette: [], slots });

describe("which parts are slots", () => {
  test.each<[part: CostumePart, isSlot: boolean]>([
    ...COLOUR_PARTS.map((part): [CostumePart, boolean] => [part, false]),
    ...SLOT_PARTS.map((part): [CostumePart, boolean] => [part, true]),
  ])("%s is a slot: %p", (part, isSlot) => {
    expect(isSlotPart(part)).toBe(isSlot);
  });
});

describe("the items a slot lists", () => {
  const slots = [[4, 36], [59, 21], [68, 70], [37], [126, 143]];

  test("are the owned ones in the page's order", () => {
    expect(itemsOf(editorOf(slots), "costume3")).toEqual([68, 70]);
  });

  test("end with the one worn when the owned list lacks it", () => {
    expect(itemsOf(editorOf(slots), "costume5")).toEqual([126, 143, 140]);
  });

  test("hold the one worn once when the owned list has it", () => {
    expect(itemsOf(editorOf(slots), "costume2")).toEqual([59, 21]);
  });

  test("add nothing for an empty slot", () => {
    expect(itemsOf(editorOf(slots), "costume1")).toEqual([4, 36]);
  });

  test("are the one worn alone when the page listed none", () => {
    expect(itemsOf(editorOf([]), "costume4")).toEqual([37]);
  });
});

describe("a tile's name", () => {
  const en = createTranslator("en");
  const ja = createTranslator("ja");

  type NameCase = [part: CostumePart, pick: number, name: string];
  test.each<NameCase>([
    ["colorFace", 5, "Face #5"],
    ["colorLimb", 0, "Limbs #0"],
    ["costume1", 36, "Mascot #36"],
    ["costume5", 140, "Mini Character #140"],
  ])("puts the part first, then the pick: %s %p", (part, pick, name) => {
    expect(tileName(part, pick, en)).toBe(name);
  });

  test.each<[part: CostumePart]>(SLOT_PARTS.map((part) => [part]))(
    "is the part alone for an empty %s",
    (part) => {
      expect(tileName(part, 0, en)).toBe(en.t(PART_LABEL[part]));
    },
  );

  test("follows the language", () => {
    expect(tileName("costume2", 21, ja)).toBe("あたま #21");
    expect(tileName("costume2", 0, ja)).toBe("あたま");
  });
});
