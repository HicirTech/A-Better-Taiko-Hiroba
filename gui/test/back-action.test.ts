import { expect, test } from "bun:test";

import { type BackAction, backAction } from "../src/navigation/back-action";
import type { Page } from "../src/navigation/pages";

type BackCase = [overlayOpen: boolean, menuOpen: boolean, page: Page, action: BackAction];

test.each<BackCase>([
  [true, false, "overview", "closeOverlay"],
  [true, false, "costume", "closeOverlay"],
  [true, true, "costume", "closeOverlay"],
  [false, true, "overview", "closeMenu"],
  [false, true, "costume", "closeMenu"],
  [false, true, "nameTitle", "closeMenu"],
  [false, true, "settings", "closeMenu"],
  [false, false, "costume", "overview"],
  [false, false, "nameTitle", "overview"],
  [false, false, "favorites", "overview"],
  [false, false, "settings", "overview"],
  [false, false, "overview", "leave"],
])(
  "Back with an overlay open %p and the menu open %p on %s does %s",
  (overlayOpen, menuOpen, page, action) => {
    expect(backAction({ overlayOpen, menuOpen, page })).toBe(action);
  },
);
