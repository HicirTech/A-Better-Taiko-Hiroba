import { expect, test } from "bun:test";

import { type PageMove, pageMove } from "../src/navigation/page-move";
import type { Page } from "../src/navigation/pages";

test.each<[from: Page, to: Page, move: PageMove]>([
  ["overview", "scores", "down"],
  ["scores", "settings", "down"],
  ["settings", "overview", "up"],
  ["favorites", "history", "up"],
])("from %s to %s the window moves %s", (from, to, move) => {
  expect(pageMove(from, to)).toBe(move);
});

test("the page shown already is no move at all", () => {
  expect(pageMove("scores", "scores")).toBeNull();
});
