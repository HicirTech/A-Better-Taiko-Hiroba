import { PAGES, type Page } from "./pages";

/** How the window goes to what it shows next; `reveal` hands a page's skeleton over to the page. */
export type WindowMove = "down" | "up" | "pipelinesIn" | "pipelinesOut" | "reveal";

/** A page lower in the list comes up from below, a higher one from above; the page shown, none. */
export function pageMove(from: Page, to: Page): WindowMove | null {
  if (from === to) {
    return null;
  }
  return PAGES.indexOf(to) > PAGES.indexOf(from) ? "down" : "up";
}
