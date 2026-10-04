import { describe, expect, test } from "bun:test";

import { checkTitleTarget, sameTitle, spaced, TITLE_FIELDS, type TitleOption } from "../src/index";

const OPTIONS: readonly TitleOption[] = [
  { id: 106, label: "サンプル称号A" },
  { id: 39, label: "サンプル称号B" },
  { id: 40, label: "サンプル 称号" },
  { id: 41, label: "サンプル 称号" },
];
const EDITOR = { options: OPTIONS };

describe("spaced", () => {
  test("makes every run of white space one space and trims the ends, non-breaking spaces included", () => {
    expect(spaced(" サンプル\u{a0}\u{a0}称号\u{3000}\t")).toBe("サンプル 称号");
    expect(spaced(" \u{a0} ")).toBe("");
    expect(spaced("称号")).toBe("称号");
  });
});

describe("sameTitle", () => {
  test("reads two titles as one when only their white space differs", () => {
    expect(sameTitle({ title: "サンプル\u{a0}称号" }, { title: "サンプル 称号" })).toBe(true);
    expect(sameTitle({ title: " サンプル\u{3000}称号\t" }, { title: "サンプル 称号" })).toBe(true);
    expect(sameTitle({ title: "サンプル  称号" }, { title: "サンプル 称号" })).toBe(true);
  });

  test("tells different names apart, and no title from every name", () => {
    expect(sameTitle({ title: "サンプル称号A" }, { title: "サンプル称号B" })).toBe(false);
    expect(sameTitle({ title: "サンプル称号" }, { title: "サンプル 称号" })).toBe(false);
    expect(sameTitle({ title: "" }, { title: "サンプル称号A" })).toBe(false);
    expect(sameTitle({ title: " \u{a0} " }, { title: "" })).toBe(true);
  });
});

describe("checkTitleTarget", () => {
  test("takes an owned id under its own name, and gives the list's name for it", () => {
    expect(checkTitleTarget(EDITOR, { id: 39, title: "サンプル称号B" })).toEqual({
      ok: true,
      value: { id: 39, label: "サンプル称号B" },
    });
    // The name the list writes, not the one the target spaces differently.
    expect(checkTitleTarget(EDITOR, { id: 40, title: "サンプル\u{a0}称号" })).toEqual({
      ok: true,
      value: { id: 40, label: "サンプル 称号" },
    });
  });

  test("picks one of two titles that share a name by its id", () => {
    expect(checkTitleTarget(EDITOR, { id: 41, title: "サンプル 称号" })).toEqual({
      ok: true,
      value: { id: 41, label: "サンプル 称号" },
    });
  });

  test("refuses an id the account does not own", () => {
    expect(checkTitleTarget(EDITOR, { id: 999, title: "サンプル称号A" })).toEqual({
      ok: false,
      error: { field: TITLE_FIELDS.notOwned },
    });
  });

  test("refuses an id paired with another title's name, and one with no name", () => {
    for (const title of ["サンプル称号B", "", "サンプル"]) {
      expect(checkTitleTarget(EDITOR, { id: 106, title })).toEqual({
        ok: false,
        error: { field: TITLE_FIELDS.notOwned },
      });
    }
  });

  test("refuses everything when the account owns no title", () => {
    expect(checkTitleTarget({ options: [] }, { id: 106, title: "サンプル称号A" })).toEqual({
      ok: false,
      error: { field: TITLE_FIELDS.notOwned },
    });
  });
});
