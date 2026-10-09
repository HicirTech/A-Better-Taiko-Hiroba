import type { Page } from "./pages";

export type BackAction =
  | "closeOverlay"
  | "leavePipelines"
  | "closeMenu"
  | "leaveMode"
  | "overview"
  | "leave";

export interface BackState {
  /** A dialog or other overlay that asked for Back is open. */
  readonly overlayOpen: boolean;
  /** The pipelines page is shown, one level past the menu. */
  readonly pipelinesShown: boolean;
  readonly menuOpen: boolean;
  /** The page is in a mode that Back leaves, such as editing a set. */
  readonly modeOn: boolean;
  readonly page: Page;
}

export function backAction({
  overlayOpen,
  pipelinesShown,
  menuOpen,
  modeOn,
  page,
}: BackState): BackAction {
  if (overlayOpen) {
    return "closeOverlay";
  }

  if (pipelinesShown) {
    return "leavePipelines";
  }

  if (menuOpen) {
    return "closeMenu";
  }

  if (modeOn) {
    return "leaveMode";
  }

  return page === "overview" ? "leave" : "overview";
}
