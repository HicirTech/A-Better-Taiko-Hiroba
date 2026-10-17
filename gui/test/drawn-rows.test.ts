import { expect, test } from "bun:test";

import { drawnRows } from "../src/ui/drawn-rows";

test("a list with no focused row draws the rows near the window", () => {
  expect(drawnRows([4, 5, 6], null, 100)).toEqual([4, 5, 6]);
});

test("the focused row is drawn in its place when it scrolls away", () => {
  expect(drawnRows([40, 41, 42], 7, 100)).toEqual([7, 40, 41, 42]);
  expect(drawnRows([4, 5, 6], 70, 100)).toEqual([4, 5, 6, 70]);
});

test("a focused row near the window is drawn once", () => {
  expect(drawnRows([4, 5, 6], 5, 100)).toEqual([4, 5, 6]);
});

test("a focused row the list no longer has is not drawn", () => {
  expect(drawnRows([0, 1, 2], 3, 3)).toEqual([0, 1, 2]);
});
