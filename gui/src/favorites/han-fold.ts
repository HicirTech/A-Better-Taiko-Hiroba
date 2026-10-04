import { HAN_FOLDED_FROM, HAN_FOLDED_TO } from "./han-fold-table";

let folds: ReadonlyMap<string, string> | null = null;

const built = (): ReadonlyMap<string, string> =>
  new Map(Array.from(HAN_FOLDED_FROM, (from, at) => [from, HAN_FOLDED_TO[at] ?? from]));

/** A Traditional Chinese or Japanese kanji as its Simplified form; one UTF-16 unit in, one out. */
export function foldHan(char: string): string {
  folds ??= built();
  return folds.get(char) ?? char;
}
