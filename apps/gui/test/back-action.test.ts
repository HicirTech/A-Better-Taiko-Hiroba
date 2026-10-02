import { expect, test } from "bun:test";

import { type BackAction, backAction } from "../src/navigation/back-action";
import type { Page } from "../src/navigation/pages";

type BackCase = [menuOpen: boolean, page: Page, action: BackAction];

test.each<BackCase>([
  [true, "overview", "closeMenu"],
  [true, "costume", "closeMenu"],
  [true, "settings", "closeMenu"],
  [false, "costume", "overview"],
  [false, "favorites", "overview"],
  [false, "settings", "overview"],
  [false, "overview", "leave"],
])("Back with the menu open %p on %s does %s", (menuOpen, page, action) => {
  expect(backAction(menuOpen, page)).toBe(action);
});
