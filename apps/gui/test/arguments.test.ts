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
      readProfile: _read,
      changeCostume: _change,
      changeTitle: _changeTitle,
      changeName: _changeName,
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

describe("PORT_ARGUMENTS.readProfile", () => {
  test("takes nothing, or one `{ renewsPortrait }` and a boolean", () => {
    const check = PORT_ARGUMENTS.readProfile;
    expect(check([])).toBe(true);
    expect(check([{ renewsPortrait: false }])).toBe(true);
    expect(check([{ renewsPortrait: true }])).toBe(true);
  });

  test("refuses anything else", () => {
    const check = PORT_ARGUMENTS.readProfile;
    const refused: unknown[][] = [
      [undefined],
      [null],
      [{}],
      [false],
      [{ renewsPortrait: "no" }],
      [{ renewsPortrait: 0 }],
      [{ renewsPortrait: null }],
      [{ renewsPortrait: false, extra: 1 }],
      [{ renewsPortrait: false }, "extra"],
      [[false]],
      [Object.assign(Object.create({ inherited: true }), { renewsPortrait: false })],
    ];
    for (const args of refused) {
      expect(check(args)).toBe(false);
    }
  });
});

const TITLE_STATE = { title: "サンプルの称号" };
const TITLE_TARGET = { id: 106, title: "サンプルの称号" };

describe("PORT_ARGUMENTS.changeTitle", () => {
  test("takes one change: the title worn, and the title wanted by the id and name the list gave", () => {
    const check = PORT_ARGUMENTS.changeTitle;
    expect(check([{ expected: TITLE_STATE, target: TITLE_TARGET }])).toBe(true);
    // No title is worn, and the largest id and longest name the port holds.
    expect(check([{ expected: { title: "" }, target: { id: 1, title: "あ" } }])).toBe(true);
    expect(check([{ expected: TITLE_STATE, target: { id: 9999, title: "あ".repeat(200) } }])).toBe(
      true,
    );
  });

  test("refuses anything else, a title by its name alone included", () => {
    const check = PORT_ARGUMENTS.changeTitle;
    const refused: unknown[][] = [
      [],
      [{ expected: TITLE_STATE, target: TITLE_TARGET }, "extra"],
      [{ expected: TITLE_STATE }],
      [{ target: TITLE_TARGET }],
      [{ expected: TITLE_STATE, target: TITLE_TARGET, token: "x" }],
      [{ expected: { title: 1 }, target: TITLE_TARGET }],
      [{ expected: { title: "あ".repeat(201) }, target: TITLE_TARGET }],
      [{ expected: { ...TITLE_STATE, id: 106 }, target: TITLE_TARGET }],
      [{ expected: {}, target: TITLE_TARGET }],
      [{ expected: TITLE_STATE, target: { ...TITLE_TARGET, id: 0 } }],
      [{ expected: TITLE_STATE, target: { ...TITLE_TARGET, id: 10000 } }],
      [{ expected: TITLE_STATE, target: { ...TITLE_TARGET, id: 1.5 } }],
      [{ expected: TITLE_STATE, target: { ...TITLE_TARGET, id: "106" } }],
      [{ expected: TITLE_STATE, target: { ...TITLE_TARGET, id: null } }],
      [{ expected: TITLE_STATE, target: { title: "あ" } }],
      [{ expected: TITLE_STATE, target: { ...TITLE_TARGET, title: "" } }],
      [{ expected: TITLE_STATE, target: { ...TITLE_TARGET, title: "あ".repeat(201) } }],
      [{ expected: TITLE_STATE, target: { ...TITLE_TARGET, title: 7 } }],
      [{ expected: TITLE_STATE, target: { ...TITLE_TARGET, url: "https://example.test/" } }],
      [{ expected: [], target: TITLE_TARGET }],
      [{ expected: null, target: TITLE_TARGET }],
      [{ expected: TITLE_STATE, target: null }],
      [[TITLE_STATE, TITLE_TARGET]],
      [
        Object.assign(Object.create({ inherited: true }), {
          expected: TITLE_STATE,
          target: TITLE_TARGET,
        }),
      ],
    ];
    for (const args of refused) {
      expect(check(args)).toBe(false);
    }
  });
});

const NAME_STATE = { nickname: "サンプルどん" };
const NAME_TARGET = { nickname: "あたらしい" };

describe("PORT_ARGUMENTS.changeName", () => {
  test("takes one change: the name shown, and the name wanted, of one to sixty-four characters", () => {
    const check = PORT_ARGUMENTS.changeName;
    expect(check([{ expected: NAME_STATE, target: NAME_TARGET }])).toBe(true);
    expect(check([{ expected: { nickname: "あ" }, target: { nickname: "い" } }])).toBe(true);
    // The core refuses what the form would not take; the port only bounds what it is sent.
    expect(check([{ expected: NAME_STATE, target: { nickname: "あ".repeat(64) } }])).toBe(true);
  });

  test("refuses anything else, an empty or a long name included", () => {
    const check = PORT_ARGUMENTS.changeName;
    const refused: unknown[][] = [
      [],
      [{ expected: NAME_STATE, target: NAME_TARGET }, "extra"],
      [{ expected: NAME_STATE }],
      [{ target: NAME_TARGET }],
      [{ expected: NAME_STATE, target: NAME_TARGET, token: "x" }],
      [{ expected: { nickname: "" }, target: NAME_TARGET }],
      [{ expected: { nickname: 1 }, target: NAME_TARGET }],
      [{ expected: { nickname: "あ".repeat(65) }, target: NAME_TARGET }],
      [{ expected: { ...NAME_STATE, title: "x" }, target: NAME_TARGET }],
      [{ expected: {}, target: NAME_TARGET }],
      [{ expected: NAME_STATE, target: { nickname: "" } }],
      [{ expected: NAME_STATE, target: { nickname: "あ".repeat(65) } }],
      [{ expected: NAME_STATE, target: { nickname: 7 } }],
      [{ expected: NAME_STATE, target: { nickname: null } }],
      [{ expected: NAME_STATE, target: { ...NAME_TARGET, oldName: "x" } }],
      [{ expected: NAME_STATE, target: "あたらしい" }],
      [{ expected: [], target: NAME_TARGET }],
      [{ expected: null, target: NAME_TARGET }],
      [{ expected: NAME_STATE, target: null }],
      [[NAME_STATE, NAME_TARGET]],
      [
        Object.assign(Object.create({ inherited: true }), {
          expected: NAME_STATE,
          target: NAME_TARGET,
        }),
      ],
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

  test("takes my page's plates, its score panel's art and the My Don by their kind alone", () => {
    expect(PORT_ARGUMENTS.readPicture([{ kind: "titlePlate" }])).toBe(true);
    expect(PORT_ARGUMENTS.readPicture([{ kind: "scorePanel" }])).toBe(true);
    expect(PORT_ARGUMENTS.readPicture([{ kind: "medalPlate" }])).toBe(true);
    expect(PORT_ARGUMENTS.readPicture([{ kind: "myDon" }])).toBe(true);
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
      [{ kind: "titlePlate", slot: 1 }],
      [{ kind: "titlePlate", url: "https://example.test/imgsrc_titleplate.php" }],
      [{ kind: "titlePlate", src: "imgsrc_titleplate.php?taiko_no=000000000000" }],
      [{ kind: "titlePlate" }, { kind: "titlePlate" }],
      [Object.assign(Object.create({ inherited: true }), { kind: "titlePlate" })],
      [{ kind: "medalPlate", id: "0123456789abcdef0123456789abcdef0123456789abcdef" }],
      [{ kind: "medalPlate", src: "imgsrc_tokenplate.php?id=0123456789abcdef" }],
      [{ kind: "medalPlate", progress: "complete" }],
      [{ kind: "myDon", fn: "mydon_111111111111" }],
      [{ kind: "myDon", url: "https://example.test/imgsrc.php?v=&kind=mydon" }],
      [{ kind: "myDon", fresh: true }],
      [{ kind: "costumeItem" }],
      [{ kind: "scorePanel", level: 5 }],
      [{ kind: "scorePanel", src: "image/sp/640/total_score_image_5.png" }],
      [{ kind: "toString" }],
      [{ kind: 0 }],
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
    expect(check(["title"])).toBe(true);
    expect(check(["name"])).toBe(true);
    for (const args of [
      [],
      ["settings"],
      ["Title"],
      ["costume", "costume"],
      [{ kind: "costume" }],
      [null],
    ]) {
      expect(check(args)).toBe(false);
    }
  });
});
