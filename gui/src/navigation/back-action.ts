import type { Page } from "./pages";

export type BackAction = "closeOverlay" | "closeMenu" | "overview" | "leave";

export interface BackState {
  /** A dialog or other overlay that asked for Back is open. */
  readonly overlayOpen: boolean;
  readonly menuOpen: boolean;
  readonly page: Page;
}

export function backAction({ overlayOpen, menuOpen, page }: BackState): BackAction {
  if (overlayOpen) {
    return "closeOverlay";
  }

  if (menuOpen) {
    return "closeMenu";
  }

  return page === "overview" ? "leave" : "overview";
}
