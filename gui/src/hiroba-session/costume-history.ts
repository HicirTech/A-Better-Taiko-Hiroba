import { isObject, sameCostume } from "@abth/core";
import { isPngDataUrl } from "../shared/png-answer";
import { type CostumeHistoryEntry, type CostumeSet, isCostumeSet } from "../shared/session-port";
import { MAX_PREVIEW_BYTES } from "./preview-costume";

/** The most sets one player's history keeps; the oldest drops off. */
export const MAX_COSTUME_HISTORY = 30;

/** `worn` first, then `history`, each set once and the list capped. A worn set with no picture
 * keeps the one it had. */
export function mergeCostumeHistory(
  history: readonly CostumeHistoryEntry[],
  worn: readonly CostumeHistoryEntry[],
): CostumeHistoryEntry[] {
  const pictureKept = (set: CostumeSet) =>
    history.find((entry) => sameCostume(entry.set, set))?.picture ?? null;
  const merged: CostumeHistoryEntry[] = [];
  const entries = [
    ...worn.map(({ set, picture }) => ({ set, picture: picture ?? pictureKept(set) })),
    ...history,
  ];
  for (const entry of entries) {
    if (!merged.some((kept) => sameCostume(kept.set, entry.set))) {
      merged.push(entry);
    }
  }
  return merged.slice(0, MAX_COSTUME_HISTORY);
}

/** The well-formed entries of a stored history, each set once and the list capped; none for
 * what is not a list. */
export function readCostumeHistory(stored: unknown): CostumeHistoryEntry[] | null {
  return Array.isArray(stored) ? mergeCostumeHistory([], stored.flatMap(entryOf)) : null;
}

function entryOf(value: unknown): CostumeHistoryEntry[] {
  if (!isObject(value)) {
    return [];
  }

  const { set, picture } = value;
  return isCostumeSet(set) && (picture === null || isPngDataUrl(picture, MAX_PREVIEW_BYTES))
    ? [{ set, picture }]
    : [];
}
