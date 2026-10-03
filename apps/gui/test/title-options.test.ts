// The stand-in's titles: two share a name, one holds a space, one is in half-width katakana.
import { describe, expect, test } from "bun:test";
import type { TitleOption } from "@abth/core";
import { OWNED_TITLES } from "../scripts/mock-profile";
import {
  currentOptions,
  filterTitles,
  foldForSearch,
  repeatedOptions,
  undoReadiness,
} from "../src/name-title/title-options";

const OPTIONS: readonly TitleOption[] = OWNED_TITLES;
const labelOf = (id: number) => OPTIONS.find((one) => one.id === id)?.label ?? "";
const idsOf = (options: readonly TitleOption[]) => options.map((one) => one.id);

describe("foldForSearch", () => {
  test("reads full-width and half-width forms as the ordinary ones, and folds case", () => {
    expect(foldForSearch("ＡＢｃ")).toBe("abc");
    expect(foldForSearch("ﾊﾝｶｸ")).toBe("ハンカク");
  });

  test("makes every kind of white space one space, a non-breaking one included", () => {
    expect(foldForSearch(" a\u{a0}\u{3000}b\t")).toBe("a b");
  });
});

describe("filterTitles", () => {
  test("gives every title, as they are, for a query with nothing in it", () => {
    expect(filterTitles(OPTIONS, "")).toBe(OPTIONS);
    expect(filterTitles(OPTIONS, " \u{3000}")).toBe(OPTIONS);
  });

  test("keeps the titles whose name holds the query, in the list's order", () => {
    expect(idsOf(filterTitles(OPTIONS, "サンプル"))).toEqual(idsOf(OPTIONS));
    expect(idsOf(filterTitles(OPTIONS, "同じ"))).toEqual([104, 105]);
    expect(idsOf(filterTitles(OPTIONS, "なし"))).toEqual([]);
  });

  test("finds a title by its half-width katakana in full-width, and a spaced one by either space", () => {
    expect(idsOf(filterTitles(OPTIONS, "ハンカク"))).toEqual([107]);
    expect(idsOf(filterTitles(OPTIONS, "ﾊﾝｶｸ"))).toEqual([107]);
    expect(idsOf(filterTitles(OPTIONS, "スペース\u{a0}入り"))).toEqual([106]);
    expect(idsOf(filterTitles(OPTIONS, "スペース\u{3000}入り"))).toEqual([106]);
  });
});

describe("currentOptions", () => {
  test("marks the one option whose name is the title worn", () => {
    expect([...currentOptions(OPTIONS, { title: labelOf(102) })]).toEqual([102]);
  });

  test("marks every option that shares the name, as the page cannot tell which is worn", () => {
    expect([...currentOptions(OPTIONS, { title: labelOf(104) })].sort()).toEqual([104, 105]);
  });

  test("reads the pages' different white space as one name", () => {
    expect([...currentOptions(OPTIONS, { title: "スペース\u{a0}入りのサンプル称号" })]).toEqual([
      106,
    ]);
  });

  test("marks none for a name that is in no title of the list, or for no title worn", () => {
    expect(currentOptions(OPTIONS, { title: "部品から作った称号" }).size).toBe(0);
    expect(currentOptions(OPTIONS, { title: "" }).size).toBe(0);
    expect(currentOptions(OPTIONS, { title: " \u{a0} " }).size).toBe(0);
  });
});

describe("repeatedOptions", () => {
  test("gives the ids of the titles whose name another title has", () => {
    expect([...repeatedOptions(OPTIONS)].sort()).toEqual([104, 105]);
  });

  test("counts names that differ only in white space as one", () => {
    const options: TitleOption[] = [
      { id: 1, label: "称号 A" },
      { id: 2, label: "称号\u{a0}A" },
      { id: 3, label: "称号 B" },
    ];
    expect([...repeatedOptions(options)].sort()).toEqual([1, 2]);
  });

  test("gives none for a list with no repeated name", () => {
    expect(repeatedOptions(OPTIONS.filter((one) => one.id !== 105)).size).toBe(0);
  });
});

describe("undoReadiness", () => {
  test("is ready when the title to go back to is exactly one title of the list", () => {
    expect(undoReadiness(OPTIONS, { title: labelOf(101) })).toBe("ready");
    expect(undoReadiness(OPTIONS, { title: "スペース\u{a0}入りのサンプル称号" })).toBe("ready");
  });

  test("is not when no title was worn before, which this version cannot put back", () => {
    expect(undoReadiness(OPTIONS, { title: "" })).toBe("noTitle");
    expect(undoReadiness(OPTIONS, { title: "\u{a0}" })).toBe("noTitle");
  });

  test("is not when the name is in no title of today's list", () => {
    expect(undoReadiness(OPTIONS, { title: "部品から作った称号" })).toBe("unresolved");
  });

  test("is not when several titles have the name, which could put on another of them", () => {
    expect(undoReadiness(OPTIONS, { title: labelOf(104) })).toBe("ambiguous");
  });
});
