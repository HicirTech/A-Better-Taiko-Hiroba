import { describe, expect, test } from "bun:test";

import {
  type CostumeSet,
  checkCostumeTarget,
  costumeAfter,
  draftCostumeChange,
  sameCostume,
} from "../src/index";

const WORN: CostumeSet = {
  colorBody: 8,
  colorLimb: 8,
  colorFace: 8,
  costume1: 0,
  costume2: 59,
  costume3: 68,
  costume4: 37,
  costume5: 126,
};

const EDITOR = {
  state: WORN,
  palette: Array.from({ length: 63 }, (_, id) => ({ id, hex: "#000000" })),
  slots: [[4, 36], [59, 21], [68, 21], [37], [126, 140]],
};

describe("draftCostumeChange", () => {
  test("a きぐるみ empties the four pieces", () => {
    expect(draftCostumeChange(WORN, 1, 36)).toEqual({
      ...WORN,
      costume1: 36,
      costume2: 0,
      costume3: 0,
      costume4: 0,
      costume5: 0,
    });
  });

  test("a piece takes the きぐるみ off, and はずす empties one slot only", () => {
    const suited = { ...WORN, costume1: 36, costume2: 0, costume3: 0, costume4: 0, costume5: 0 };
    expect(draftCostumeChange(suited, 2, 59)).toEqual({ ...suited, costume1: 0, costume2: 59 });
    expect(draftCostumeChange(WORN, 3, 0)).toEqual({ ...WORN, costume3: 0 });
  });
});

describe("checkCostumeTarget", () => {
  test("refuses #22: a piece beside a きぐるみ, which the server ignores and answers 0", () => {
    const suited = { ...WORN, costume1: 36, costume2: 0, costume3: 0, costume4: 0, costume5: 0 };
    expect(checkCostumeTarget({ ...EDITOR, state: suited }, { ...suited, costume2: 59 })).toEqual({
      ok: false,
      error: { field: "costume1" },
    });
  });

  test("refuses an item not owned in its slot, and a colour not in the palette", () => {
    expect(checkCostumeTarget(EDITOR, { ...WORN, costume4: 21 })).toEqual({
      ok: false,
      error: { field: "costume4" },
    });
    expect(checkCostumeTarget(EDITOR, { ...WORN, costume1: 59 })).toEqual({
      ok: false,
      error: { field: "costume1" },
    });
    expect(checkCostumeTarget(EDITOR, { ...WORN, colorFace: 63 })).toEqual({
      ok: false,
      error: { field: "colorFace" },
    });
  });

  test("passes an item owned in its slot, 0, and a value already in its place", () => {
    expect(checkCostumeTarget(EDITOR, { ...WORN, costume3: 21 }).ok).toBe(true);
    expect(checkCostumeTarget(EDITOR, { ...WORN, costume5: 0 }).ok).toBe(true);
    const unlisted = { ...WORN, costume5: 999 };
    expect(
      checkCostumeTarget({ ...EDITOR, state: unlisted }, { ...unlisted, colorFace: 3 }).ok,
    ).toBe(true);
  });

  test("passes #23: the whole set back from a きぐるみ in one body", () => {
    const suited = { ...WORN, costume1: 36, costume2: 0, costume3: 0, costume4: 0, costume5: 0 };
    expect(checkCostumeTarget({ ...EDITOR, state: suited }, WORN)).toEqual({
      ok: true,
      value: WORN,
    });
  });
});

describe("costumeAfter", () => {
  test("#21: a きぐるみ empties the pieces whatever the body carried", () => {
    expect(costumeAfter({ ...WORN, costume1: 36 })).toEqual({
      ...WORN,
      costume1: 36,
      costume2: 0,
      costume3: 0,
      costume4: 0,
      costume5: 0,
    });
  });

  test("#23 and a colour alone: the body is what stays", () => {
    expect(costumeAfter(WORN)).toEqual(WORN);
    const recoloured = { ...WORN, colorFace: 3 };
    const after = costumeAfter(recoloured);
    expect(after).toEqual(recoloured);
    expect(
      Object.keys(WORN).filter(
        (key) => after[key as keyof CostumeSet] !== WORN[key as keyof CostumeSet],
      ),
    ).toEqual(["colorFace"]);
  });
});

describe("sameCostume", () => {
  test("compares all eight values", () => {
    expect(sameCostume(WORN, { ...WORN })).toBe(true);
    expect(sameCostume(WORN, { ...WORN, costume5: 0 })).toBe(false);
    expect(sameCostume(WORN, { ...WORN, colorLimb: 9 })).toBe(false);
  });
});
