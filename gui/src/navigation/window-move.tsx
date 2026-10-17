import { keyframes } from "@emotion/react";
import { GlobalStyles } from "@mui/material";
import { flushSync } from "react-dom";

import type { WindowMove } from "./page-move";

/** The pipelines page's slide as MUI drew it: its time and ease for entering the screen. */
export const MOVE_TIMING = "225ms cubic-bezier(0, 0, 0.2, 1)";
const LEAVE_TIMING = "195ms cubic-bezier(0.4, 0, 0.6, 1)";

/** What stays put while a page moves, each drawn by itself: the navigation and the menu's parts. */
export const STILL = {
  nav: "abth-nav",
  scrim: "abth-scrim",
  menuButton: "abth-menu-button",
} as const;

/** Where the system asks for less motion, nothing slides. */
export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** Makes `change` one move of the window: a slide where the browser draws one, at once otherwise. */
export function moveWindow(move: WindowMove, change: () => void): void {
  if (!("startViewTransition" in document) || matchMedia(REDUCED_MOTION).matches) {
    change();
    return;
  }
  document.documentElement.dataset.windowMove = move;
  document.startViewTransition(() => flushSync(change));
}

const GONE = keyframes`from, to { opacity: 0; }`;
const FROM_BELOW = keyframes`from { transform: translateY(100%); }`;
const FROM_ABOVE = keyframes`from { transform: translateY(-100%); }`;
const FROM_LEFT = keyframes`from { transform: translateX(-100%); }`;
const TO_LEFT = keyframes`to { transform: translateX(-100%); }`;

const STILL_NAMES = Object.values(STILL);
const stillParts = (part: "group" | "old" | "new") =>
  STILL_NAMES.map((name) => `::view-transition-${part}(${name})`).join(", ");
const pageAt = (move: WindowMove, part: "old" | "new") =>
  `html[data-window-move="${move}"]::view-transition-${part}(root)`;

/** The window's moves: the old page goes, the new one slides in, and the navigation keeps still. */
export function WindowMoveStyles() {
  return (
    <GlobalStyles
      styles={(theme) => ({
        // What a sliding page uncovers until it is in place.
        "::view-transition": { backgroundColor: theme.palette.background.default },
        "::view-transition-old(root), ::view-transition-new(root)": { mixBlendMode: "normal" },
        [`${stillParts("group")}, ${stillParts("new")}`]: { animation: "none" },
        [stillParts("old")]: { display: "none" },
        [pageAt("down", "old")]: { animation: `${GONE} ${MOVE_TIMING} both` },
        [pageAt("down", "new")]: { animation: `${FROM_BELOW} ${MOVE_TIMING} both` },
        [pageAt("up", "old")]: { animation: `${GONE} ${MOVE_TIMING} both` },
        [pageAt("up", "new")]: { animation: `${FROM_ABOVE} ${MOVE_TIMING} both` },
        [pageAt("pipelinesIn", "old")]: { animation: `${GONE} ${MOVE_TIMING} both` },
        [pageAt("pipelinesIn", "new")]: { animation: `${FROM_LEFT} ${MOVE_TIMING} both` },
        // The pipelines page slides back over the page it uncovers.
        [pageAt("pipelinesOut", "old")]: {
          animation: `${TO_LEFT} ${LEAVE_TIMING} both`,
          zIndex: 1,
        },
        [pageAt("pipelinesOut", "new")]: { animation: "none" },
      })}
    />
  );
}
