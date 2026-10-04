import { isErr, ok } from "../operation-results";
import { readMyPage } from "./my-page";
import type { CrossCheck } from "./types";

/** Whitespace as one space and none at the ends, non-breaking spaces included. */
export function spaced(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** My page's title, read around costume and name writes: a misjudged pre-check could move it. */
export const TITLE_STAYS: CrossCheck<string> = {
  read: async (deps) => {
    const page = await readMyPage(deps);
    return isErr(page) ? page : ok(page.value.title);
  },
  same: (left, right) => spaced(left) === spaced(right),
};
