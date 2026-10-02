import {
  checkTitleTarget,
  isErr,
  sameTitle,
  spaced,
  TITLE_FIELDS,
  type TitleOption,
  type TitleState,
} from "@abth/core";

/**
 * What a title is searched by: Unicode compatibility-folded (full-width letters and half-width
 * katakana read as their ordinary forms, a non-breaking space as a space), lower-cased, with every
 * run of white space one space. Both what was typed and each title's name are folded alike.
 */
export function foldForSearch(text: string): string {
  return spaced(text.normalize("NFKC").toLowerCase());
}

/**
 * The titles whose name holds what was typed, in the list's own order: all of them for a query with
 * nothing in it.
 */
export function filterTitles(
  options: readonly TitleOption[],
  query: string,
): readonly TitleOption[] {
  const wanted = foldForSearch(query);
  return wanted === ""
    ? options
    : options.filter((one) => foldForSearch(one.label).includes(wanted));
}

/**
 * The options that read as the title worn, by name, as the pages are compared: one when the name is
 * one title's own, several when titles share it, none when it is in no title of the list (a title
 * built from parts) or when no title is worn. The page can never tell which of several is worn.
 */
export function currentOptions(
  options: readonly TitleOption[],
  worn: TitleState,
): ReadonlySet<number> {
  if (spaced(worn.title) === "") {
    return new Set();
  }
  return new Set(
    options.filter((one) => sameTitle({ title: one.label }, worn)).map((one) => one.id),
  );
}

/** The ids of the titles whose name another title of the list has too: the ones to tell by number. */
export function repeatedOptions(options: readonly TitleOption[]): ReadonlySet<number> {
  const byName = new Map<string, number[]>();
  for (const one of options) {
    const name = spaced(one.label);
    byName.set(name, [...(byName.get(name) ?? []), one.id]);
  }
  return new Set([...byName.values()].filter((ids) => ids.length > 1).flat());
}

/**
 * Whether the undo of a title change can be offered, from the title it would go back to: only by its
 * name, and only when the name is exactly one title of today's list (the core refuses the rest).
 * `noTitle` is no title before, which this version cannot put back.
 */
export type UndoReadiness = "ready" | "noTitle" | "unresolved" | "ambiguous";

export function undoReadiness(
  options: readonly TitleOption[],
  goesBackTo: TitleState,
): UndoReadiness {
  if (spaced(goesBackTo.title) === "") {
    return "noTitle";
  }
  const checked = checkTitleTarget({ options }, { id: null, title: goesBackTo.title });
  if (!isErr(checked)) {
    return "ready";
  }
  return checked.error.field === TITLE_FIELDS.ambiguous ? "ambiguous" : "unresolved";
}
