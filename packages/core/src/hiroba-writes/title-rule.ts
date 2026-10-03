import type { TitleEditorReading } from "../hiroba-dom-parser";
import type { TitleState } from "../hiroba-models";
import { err, ok, type Result } from "../operation-results";
import { spaced } from "./cross-checks";
import type { InvalidTarget } from "./types";

/** The title to write; an undo has only the name (`id` null), as no page gives the worn id. */
export interface TitleTarget {
  readonly id: number | null;
  readonly title: string;
}

/** The id both posts carry, and the list's name for it, which the page shows once saved. */
export interface TitleBody {
  readonly id: number;
  readonly label: string;
}

export const TITLE_FIELDS = {
  notOwned: "title.notOwned",
  unresolved: "title.unresolved",
  ambiguous: "title.ambiguous",
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
  const named = editor.options.filter((one) => sameTitle({ title: one.label }, target));
  if (target.id !== null) {
    const owned = named.find((one) => one.id === target.id);
    return owned === undefined ? err({ field: TITLE_FIELDS.notOwned }) : ok({ ...owned });
  }
  const [only, ...others] = named;
  if (only === undefined || spaced(target.title) === "") {
    return err({ field: TITLE_FIELDS.unresolved });
  }
  return others.length > 0 ? err({ field: TITLE_FIELDS.ambiguous }) : ok({ ...only });
}
