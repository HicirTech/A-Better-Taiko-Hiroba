import type { Page } from "./pages";

/** What a press of the system's Back does in the window. */
export type BackAction = "closeMenu" | "overview" | "leave";

/**
 * Back as Android's apps with a menu of pages take it: it shuts the menu while it is open, else
 * goes from another page to the Overview, the first, else leaves the app.
 */
export function backAction(menuOpen: boolean, page: Page): BackAction {
  if (menuOpen) {
    return "closeMenu";
  }

  return page === "overview" ? "leave" : "overview";
}
