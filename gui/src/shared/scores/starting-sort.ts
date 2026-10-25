import { keepSetting, keptSetting, pageStorage } from "../kept-settings";
import { SORT_CHOICES, type SortChoice } from "./score-order";

/** What Scores is sorted by as it opens, until Settings chooses another. */
export const DEFAULT_STARTING_SORT: SortChoice = "recent";

const KEY = "abth.scoresSort";

const isSortChoice = (value: unknown): value is SortChoice =>
  (SORT_CHOICES as readonly unknown[]).includes(value);

export function keptStartingSort(storage: Storage | undefined = pageStorage()): SortChoice {
  return keptSetting(KEY, isSortChoice, storage) ?? DEFAULT_STARTING_SORT;
}

export function keepStartingSort(
  choice: SortChoice,
  storage: Storage | undefined = pageStorage(),
): void {
  keepSetting(KEY, choice, storage);
}
