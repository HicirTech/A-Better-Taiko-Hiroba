import { FOLDER_SLOT_COUNT, isObject, isSongNo } from "@abth/core";
import type { FolderHistoryEntry } from "../shared/session-port";
import { isSetName, sameSongs } from "../shared/sets/favorite-sets";

/** The most folders one player's history keeps; the oldest drops off. */
export const MAX_FOLDER_HISTORY = 30;

/** `saved` first, then `replaced` unless the history holds it, then the rest, each folder once. */
export function mergeFolderHistory(
  history: readonly FolderHistoryEntry[],
  saved: FolderHistoryEntry,
  replaced: Pick<FolderHistoryEntry, "songs" | "setName">,
): FolderHistoryEntry[] {
  const keptBefore = history.find((entry) => sameSongs(entry.songs, saved.songs));
  const first = { ...saved, setName: saved.setName ?? keptBefore?.setName ?? null };
  const others = history
    .filter((entry) => entry !== keptBefore)
    .map((entry) =>
      sameSongs(entry.songs, replaced.songs)
        ? { ...entry, setName: entry.setName ?? replaced.setName }
        : entry,
    );
  // A folder kept before keeps its own time: it was saved then, and only replaced now.
  const held =
    sameSongs(replaced.songs, saved.songs) ||
    others.some((entry) => sameSongs(entry.songs, replaced.songs));
  const before = held ? [] : [{ ...replaced, keptAt: saved.keptAt }];
  return [first, ...before, ...others].slice(0, MAX_FOLDER_HISTORY);
}

/** The well-formed entries of a stored history, each folder once and the list capped. */
export function readFolderHistory(stored: unknown): FolderHistoryEntry[] {
  const read: FolderHistoryEntry[] = [];
  for (const entry of Array.isArray(stored) ? stored.flatMap(entryOf) : []) {
    if (!read.some((kept) => sameSongs(kept.songs, entry.songs))) {
      read.push(entry);
    }
  }
  return read.slice(0, MAX_FOLDER_HISTORY);
}

function entryOf(value: unknown): FolderHistoryEntry[] {
  if (!isObject(value)) {
    return [];
  }

  const { songs, keptAt, setName } = value;
  return Array.isArray(songs) &&
    songs.length <= FOLDER_SLOT_COUNT &&
    songs.every(isSongNo) &&
    typeof keptAt === "number" &&
    Number.isFinite(keptAt)
    ? [{ songs, keptAt, setName: isSetName(setName) ? setName : null }]
    : [];
}
