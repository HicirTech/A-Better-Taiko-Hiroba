import { isErr, ok } from "../operation-results";
import { readMyPage } from "./my-page";
import type { CrossCheck } from "./types";

/** Whitespace as one space and none at the ends, non-breaking spaces included. */
export function spaced(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * The title on my page, read before and after a write of a kind not yet live-checked from the
 * platform: a costume write's pre-check exists to warn that a title or item that cannot be combined
 * will come off, and if it ever misjudged, the title is what would move. A rename shares this page,
 * and checks the same thing: that the title stayed.
 */
export const TITLE_STAYS: CrossCheck<string> = {
  read: async (deps) => {
    const page = await readMyPage(deps);
    return isErr(page) ? page : ok(page.value.title);
  },
  same: (left, right) => spaced(left) === spaced(right),
};
