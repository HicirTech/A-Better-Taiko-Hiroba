import { describe, expect, test } from "bun:test";

import {
  isGenre,
  isLevel,
  isObject,
  isRank,
  isRecord,
  isSongNo,
  isWholeNumber,
} from "../src/index";

describe("the guards", () => {
  test("take any object but null as an object, arrays too", () => {
    expect([{}, [], { a: 1 }].map(isObject)).toEqual([true, true, true]);
    expect([null, undefined, "x", 1].map(isObject)).toEqual([false, false, false, false]);
  });

  test("take only an object that is not an array as a record", () => {
    expect([{}, { a: 1 }].map(isRecord)).toEqual([true, true]);
    expect([[], null, "x"].map(isRecord)).toEqual([false, false, false]);
  });

  test("take zero and the positive integers as whole numbers", () => {
    expect([0, 1, 5000].map(isWholeNumber)).toEqual([true, true, true]);
    expect([-1, 1.5, Number.NaN, "1"].map(isWholeNumber)).toEqual([false, false, false, false]);
  });

  test("take one to five digits as a song number, and nothing else", () => {
    expect(["1", "01538", "99999"].map(isSongNo)).toEqual([true, true, true]);
    expect(["", "123456", "12a", 1538].map(isSongNo)).toEqual([false, false, false, false]);
  });

  test("take the five difficulties as levels", () => {
    expect([1, 5].map(isLevel)).toEqual([true, true]);
    expect([0, 6, null, "4"].map(isLevel)).toEqual([false, false, false, false]);
  });

  test("take a score rank or null as a rank", () => {
    expect([null, 2, 8].map(isRank)).toEqual([true, true, true]);
    expect([1, 9, "8"].map(isRank)).toEqual([false, false, false]);
  });

  test("take a genre or null as a genre", () => {
    expect([null, 1, 8].map(isGenre)).toEqual([true, true, true]);
    expect([0, 9, "1"].map(isGenre)).toEqual([false, false, false]);
  });
});
