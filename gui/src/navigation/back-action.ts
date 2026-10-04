import type { Page } from "./pages";

export type BackAction = "closeOverlay" | "closeMenu" | "leaveMode" | "overview" | "leave";

export interface BackState {
  /** A dialog or other overlay that asked for Back is open. */
  readonly overlayOpen: boolean;
  readonly menuOpen: boolean;
  /** The page is in a mode that Back leaves, such as editing a set. */
  readonly modeOn: boolean;
  readonly page: Page;
}

export function backAction({ overlayOpen, menuOpen, modeOn, page }: BackState): BackAction {
  if (overlayOpen) {
    return "closeOverlay";
  }

  if (menuOpen) {
    return "closeMenu";
  }

  if (modeOn) {
    return "leaveMode";
  }

  return page === "overview" ? "leave" : "overview";
}
