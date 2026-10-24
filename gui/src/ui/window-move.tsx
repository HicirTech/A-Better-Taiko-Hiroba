import { keyframes } from "@emotion/react";
import { GlobalStyles } from "@mui/material";
import { flushSync } from "react-dom";

/** How the window goes to what it shows next; `reveal` hands a page's skeleton over to the page. */
export type WindowMove = "down" | "up" | "pipelinesIn" | "pipelinesOut" | "reveal";

/** The pipelines page's slide as MUI drew it: its time and ease for entering the screen. */
export const MOVE_TIMING = "225ms cubic-bezier(0, 0, 0.2, 1)";
const LEAVE_TIMING = "195ms cubic-bezier(0.4, 0, 0.6, 1)";
/** How long a page takes to fade in after a wait, or to take over from its skeleton. */
export const FADE_MS = 200;
const REVEAL_TIMING = `${FADE_MS}ms ease-out`;

/** What stays put while a page moves, each drawn by itself: the navigation and the menu's parts. */
export const STILL = {
  nav: "abth-nav",
  scrim: "abth-scrim",
  menuButton: "abth-menu-button",
} as const;

/** Where the system asks for less motion, nothing slides. */
export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

// A new move cuts the one on screen short, so a reveal waits for a page's slide to end.
let running: ViewTransition | null = null;

/** Makes `change` one move of the window: a slide where the browser draws one, at once otherwise. */
export function moveWindow(move: WindowMove, change: () => void): void {
  if (!("startViewTransition" in document) || matchMedia(REDUCED_MOTION).matches) {
    change();
    return;
  }
  if (move === "reveal" && running !== null) {
    const again = () => moveWindow(move, change);
    void running.finished.then(again, again);
    return;
  }
  document.documentElement.dataset.windowMove = move;
  const transition = document.startViewTransition(() => flushSync(change));
  running = transition;
  const ended = () => {
    if (running === transition) {
      running = null;
    }
  };
  void transition.finished.then(ended, ended);
}

const GONE = keyframes`from, to { opacity: 0; }`;
const FROM_BELOW = keyframes`from { transform: translateY(100%); }`;
const FROM_ABOVE = keyframes`from { transform: translateY(-100%); }`;
const FROM_LEFT = keyframes`from { transform: translateX(-100%); }`;
const TO_LEFT = keyframes`to { transform: translateX(-100%); }`;
const FADE_OUT = keyframes`to { opacity: 0; }`;
const FADE_IN = keyframes`from { opacity: 0; }`;

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
        // The skeleton fades out as the page fades in; added light keeps the sum from dimming.
        [pageAt("reveal", "old")]: {
          animation: `${FADE_OUT} ${REVEAL_TIMING} both`,
          mixBlendMode: "plus-lighter",
        },
        [pageAt("reveal", "new")]: {
          animation: `${FADE_IN} ${REVEAL_TIMING} both`,
          mixBlendMode: "plus-lighter",
        },
      })}
    />
  );
}
