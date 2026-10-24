import { PAGES, type Page } from "./pages";

/** How the window goes from one page of the list to another. */
export type PageMove = "down" | "up";

/** A page lower in the list comes up from below, a higher one from above; the page shown, none. */
export function pageMove(from: Page, to: Page): PageMove | null {
  if (from === to) {
    return null;
  }
  return PAGES.indexOf(to) > PAGES.indexOf(from) ? "down" : "up";
}
