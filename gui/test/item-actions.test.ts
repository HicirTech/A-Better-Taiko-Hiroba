import { expect, test } from "bun:test";

import { type ItemAction, runsAtOnce } from "../src/ui/item-actions";

const nothing = () => undefined;
const ADD: ItemAction = { key: "add", label: "Add to a set", chooses: true, onPick: nothing };
const RENAME: ItemAction = { key: "rename", label: "Rename", onPick: nothing };
const DELETE: ItemAction = { key: "delete", label: "Delete", destructive: true, onPick: nothing };
const POINTER = { x: 120, y: 80 };

test("a long press runs an item's only action at once where that action asks the rest", () => {
  expect(runsAtOnce([ADD], null)).toBe(ADD);
});

test("a right-click shows the menu, even for an item's only action", () => {
  expect(runsAtOnce([ADD], POINTER)).toBeNull();
});

test("a long press shows the dialog for an only action that asks nothing more", () => {
  expect(runsAtOnce([RENAME], null)).toBeNull();
});

test("a long press shows the dialog for an item with several actions", () => {
  expect(runsAtOnce([RENAME, DELETE], null)).toBeNull();
  expect(runsAtOnce([ADD, DELETE], null)).toBeNull();
});
