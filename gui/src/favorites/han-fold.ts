import { HAN_FOLDED_FROM, HAN_FOLDED_TO } from "./han-fold-table";

let folds: ReadonlyMap<string, string> | null = null;

function built(): ReadonlyMap<string, string> {
  const to = Array.from(HAN_FOLDED_TO);
  return new Map(Array.from(HAN_FOLDED_FROM, (from, at) => [from, to[at] ?? from]));
}

/** A Traditional Chinese or Japanese kanji as its Simplified form; one character in, one out. */
export function foldHan(char: string): string {
  folds ??= built();
  return folds.get(char) ?? char;
}
