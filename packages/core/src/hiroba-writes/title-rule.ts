import type { TitleEditorReading } from "../hiroba-dom-parser";
import type { TitleState } from "../hiroba-models";
import { err, ok, type Result } from "../operation-results";
import { spaced } from "./cross-checks";
import type { InvalidTarget } from "./types";

/** The title to write, by the id and the name the list gives it. */
export interface TitleTarget {
  readonly id: number;
  readonly title: string;
}

/** The id both posts carry, and the list's name for it, which the page shows once saved. */
export interface TitleBody {
  readonly id: number;
  readonly label: string;
}

export const TITLE_FIELDS = {
  notOwned: "title.notOwned",
} as const;

/** Same name once whitespace is one space: the pages spell the title's spaces differently. */
export function sameTitle(left: TitleState, right: TitleState): boolean {
  return spaced(left.title) === spaced(right.title);
}

/** Checks a target against the list: the server takes the id, never a name, which can repeat. */
export function checkTitleTarget(
  editor: Pick<TitleEditorReading, "options">,
  target: TitleTarget,
): Result<TitleBody, InvalidTarget> {
  const owned = editor.options.find(
    (one) => one.id === target.id && sameTitle({ title: one.label }, target),
  );
  return owned === undefined ? err({ field: TITLE_FIELDS.notOwned }) : ok({ ...owned });
}
