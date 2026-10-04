import { expect, test } from "bun:test";

import { type BackAction, backAction } from "../src/navigation/back-action";
import type { Page } from "../src/navigation/pages";

type BackCase = [
  overlayOpen: boolean,
  menuOpen: boolean,
  modeOn: boolean,
  page: Page,
  action: BackAction,
];

test.each<BackCase>([
  [true, false, false, "overview", "closeOverlay"],
  [true, false, false, "costume", "closeOverlay"],
  [true, true, false, "costume", "closeOverlay"],
  [true, true, true, "favorites", "closeOverlay"],
  [false, true, false, "overview", "closeMenu"],
  [false, true, false, "costume", "closeMenu"],
  [false, true, false, "nameTitle", "closeMenu"],
  [false, true, false, "settings", "closeMenu"],
  [false, true, true, "favorites", "closeMenu"],
  [false, false, true, "favorites", "leaveMode"],
  [false, false, false, "costume", "overview"],
  [false, false, false, "nameTitle", "overview"],
  [false, false, false, "favorites", "overview"],
  [false, false, false, "settings", "overview"],
  [false, false, false, "overview", "leave"],
])(
  "Back with an overlay open %p, the menu open %p and a mode on %p on %s does %s",
  (overlayOpen, menuOpen, modeOn, page, action) => {
    expect(backAction({ overlayOpen, menuOpen, modeOn, page })).toBe(action);
  },
);
