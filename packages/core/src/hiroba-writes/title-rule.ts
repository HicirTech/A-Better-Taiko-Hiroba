import type { TitleEditorReading } from "../hiroba-dom-parser";
import type { TitleState } from "../hiroba-models";
import { err, ok, type Result } from "../operation-results";
import { spaced } from "./cross-checks";
import type { InvalidTarget } from "./types";

/**
 * The title to write: one the account owns, by the id the list gives it and its name, or, for an
 * undo, by its name alone (`id` null). An undo has no id to go back to: no page gives the worn
 * title's id, so the record holds the name, and the name is resolved against today's list.
 */
export interface TitleTarget {
  readonly id: number | null;
  readonly title: string;
}

/**
 * What both posts carry for a title: the id, which the server takes, and the name the list gives
 * that id, which is what the page shows once it is saved.
 */
export interface TitleBody {
  readonly id: number;
  readonly label: string;
}

/**
 * The `field` of a refused title target, a code the interface words:
 *
 * - `notOwned`: the id is not in the list, or is there under another name;
 * - `unresolved`: no title of the list has the name to go back to, or the name is empty;
 * - `ambiguous`: more than one has it, and picking one would risk another title of that name.
 */
export const TITLE_FIELDS = {
  notOwned: "title.notOwned",
  unresolved: "title.unresolved",
  ambiguous: "title.ambiguous",
} as const;

/** Whether two titles read the same: by name, whitespace made one space, as the pages differ in it. */
export function sameTitle(left: TitleState, right: TitleState): boolean {
  return spaced(left.title) === spaced(right.title);
}

/**
 * A target checked before anything is sent, against the list the title page gave:
 *
 * - an id must be in the list, and under the name the target gives it: an id paired with another
 *   name is not a title of the list either;
 * - a name alone must be the name of exactly one title of the list. The server takes the id, never
 *   the name, and two titles can share one, so an undo that wrote the first of several could put
 *   on a different title of the same name.
 */
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
