import type { Page } from "./pages";

export type BackAction = "closeMenu" | "overview" | "leave";

export function backAction(menuOpen: boolean, page: Page): BackAction {
  if (menuOpen) {
    return "closeMenu";
  }

  return page === "overview" ? "leave" : "overview";
}
