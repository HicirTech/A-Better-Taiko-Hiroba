import { expect, test } from "bun:test";

import { type BackAction, backAction } from "../src/navigation/back-action";
import type { Page } from "../src/navigation/pages";

type BackCase = [
  overlayOpen: boolean,
  pipelinesShown: boolean,
  menuOpen: boolean,
  modeOn: boolean,
  page: Page,
  action: BackAction,
];

test.each<BackCase>([
  [true, false, false, false, "overview", "closeOverlay"],
  [true, false, false, false, "costume", "closeOverlay"],
  [true, false, true, false, "costume", "closeOverlay"],
  [true, false, true, true, "favorites", "closeOverlay"],
  [false, false, true, false, "overview", "closeMenu"],
  [false, false, true, false, "costume", "closeMenu"],
  [false, false, true, false, "nameTitle", "closeMenu"],
  [false, false, true, false, "settings", "closeMenu"],
  [false, false, true, true, "favorites", "closeMenu"],
  [false, false, false, true, "favorites", "leaveMode"],
  [false, false, false, false, "costume", "overview"],
  [false, false, false, false, "nameTitle", "overview"],
  [false, false, false, false, "favorites", "overview"],
  [false, false, false, false, "settings", "overview"],
  [false, false, false, false, "overview", "leave"],
  [false, true, false, false, "overview", "leavePipelines"],
  [false, true, false, true, "favorites", "leavePipelines"],
  [true, true, false, false, "costume", "closeOverlay"],
])(
  "Back with an overlay open %p, the pipelines page %p, the menu open %p and a mode on %p on %s does %s",
  (overlayOpen, pipelinesShown, menuOpen, modeOn, page, action) => {
    expect(backAction({ overlayOpen, pipelinesShown, menuOpen, modeOn, page })).toBe(action);
  },
);
