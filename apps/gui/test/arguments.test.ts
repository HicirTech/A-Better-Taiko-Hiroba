/** What each verb of the port accepts from the interface, as it arrives over IPC. */
import { describe, expect, test } from "bun:test";

import { PORT_ARGUMENTS } from "../src/session-port";

const SET = {
  colorBody: 12,
  colorLimb: 12,
  colorFace: 5,
  costume1: 0,
  costume2: 21,
  costume3: 68,
  costume4: 37,
  costume5: 140,
};

describe("PORT_ARGUMENTS", () => {
  test("a verb that takes nothing accepts no arguments, and refuses any", () => {
    const {
      changeCostume: _change,
      previewCostume: _preview,
      readPicture: _picture,
      undo: _undo,
      ...takingNothing
    } = PORT_ARGUMENTS;
    for (const check of Object.values(takingNothing)) {
      expect(check([])).toBe(true);
      expect(check([undefined])).toBe(false);
      expect(check([{ url: "https://example.test/" }])).toBe(false);
    }
  });

  test("changeCostume takes one change: two sets of eight whole numbers from 0 to 9999", () => {
    const check = PORT_ARGUMENTS.changeCostume;
    expect(check([{ expected: SET, target: SET }])).toBe(true);
    expect(check([{ expected: SET, target: { ...SET, costume1: 9999, colorFace: 0 } }])).toBe(true);
  });

  test("changeCostume refuses anything else", () => {
    const check = PORT_ARGUMENTS.changeCostume;
    const refused: unknown[][] = [
      [],
      [{ expected: SET, target: SET }, "extra"],
      [{ expected: SET }],
      [{ expected: SET, target: SET, token: "x" }],
      [{ expected: SET, target: { ...SET, costume1: -1 } }],
      [{ expected: SET, target: { ...SET, costume1: 10000 } }],
      [{ expected: SET, target: { ...SET, costume1: 1.5 } }],
      [{ expected: SET, target: { ...SET, costume1: "1" } }],
      [{ expected: SET, target: { ...SET, costume6: 0 } }],
      [{ expected: SET, target: { colorBody: 1 } }],
      [{ expected: [], target: SET }],
      [{ expected: null, target: SET }],
      [[SET, SET]],
      [Object.assign(Object.create({ inherited: true }), { expected: SET, target: SET })],
    ];
    for (const args of refused) {
      expect(check(args)).toBe(false);
    }
  });
});

describe("PORT_ARGUMENTS.previewCostume", () => {
  test("takes one set of eight whole numbers from 0 to 9999, and nothing else", () => {
    const check = PORT_ARGUMENTS.previewCostume;
    expect(check([SET])).toBe(true);
    expect(check([{ ...SET, costume1: 9999, colorFace: 0 }])).toBe(true);
    const refused: unknown[][] = [
      [],
      [SET, SET],
      [{ ...SET, colorFace: -1 }],
      [{ ...SET, colorFace: 10000 }],
      [{ ...SET, colorFace: 0.5 }],
      [{ ...SET, colorFace: "8&taiko_no=1" }],
      [{ ...SET, url: "https://example.test/" }],
      [{ expected: SET, target: SET }],
      [[SET]],
      [null],
      [Object.assign(Object.create({ inherited: true }), SET)],
    ];
    for (const args of refused) {
      expect(check(args)).toBe(false);
    }
  });
});

describe("PORT_ARGUMENTS.readPicture", () => {
  test("takes one item's thumbnail: a slot from 1 to 5 and an id from 1 to 9999", () => {
    const check = PORT_ARGUMENTS.readPicture;
    expect(check([{ kind: "costumeItem", slot: 1, id: 36 }])).toBe(true);
    expect(check([{ kind: "costumeItem", slot: 5, id: 9999 }])).toBe(true);
    expect(check([{ id: 1, slot: 3, kind: "costumeItem" }])).toBe(true);
  });

  test("refuses a URL, another key, a number out of range or not whole, and any other shape", () => {
    const check = PORT_ARGUMENTS.readPicture;
    const item = { kind: "costumeItem", slot: 1, id: 36 };
    const refused: unknown[][] = [
      [],
      [item, item],
      [{ ...item, slot: 0 }],
      [{ ...item, slot: 6 }],
      [{ ...item, id: 0 }],
      [{ ...item, id: 10000 }],
      [{ ...item, id: 1.5 }],
      [{ ...item, id: "1" }],
      [{ ...item, slot: "1" }],
      [{ ...item, url: "https://example.test/imgsrc_kisekae.php" }],
      [{ ...item, src: "imgsrc_kisekae.php?cos=36&type=1" }],
      [{ slot: 1, id: 36 }],
      [{ ...item, kind: "titlePlate" }],
      [{ kind: "titlePlate" }],
      [{ ...item, kind: undefined }],
      [[item]],
      [null],
      ["costumeItem"],
      [Object.assign(Object.create({ inherited: true }), item)],
    ];
    for (const args of refused) {
      expect(check(args)).toBe(false);
    }
  });
});

describe("PORT_ARGUMENTS.undo", () => {
  test("takes one kind of write the app knows, and nothing else", () => {
    const check = PORT_ARGUMENTS.undo;
    expect(check(["costume"])).toBe(true);
    for (const args of [[], ["title"], ["costume", "costume"], [{ kind: "costume" }], [null]]) {
      expect(check(args)).toBe(false);
    }
  });
});
