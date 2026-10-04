import {
  checkTitleTarget,
  isErr,
  sameTitle,
  spaced,
  TITLE_FIELDS,
  type TitleOption,
  type TitleState,
} from "@abth/core";

/** NFKC-folded so full-width and half-width forms match, lower-cased, spaces collapsed. */
export function foldForSearch(text: string): string {
  return spaced(text.normalize("NFKC").toLowerCase());
}

export function filterTitles(
  options: readonly TitleOption[],
  query: string,
): readonly TitleOption[] {
  const wanted = foldForSearch(query);
  return wanted === ""
    ? options
    : options.filter((one) => foldForSearch(one.label).includes(wanted));
}

// By name, as the pages are compared: several when titles share it, none when it is in no title of
// the list (a title built from parts). The page can never tell which of several is worn.
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

// Undo goes back by name only, and only to exactly one title of today's list (the core refuses the
// rest); `noTitle` is no title before, which this version cannot put back.
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
