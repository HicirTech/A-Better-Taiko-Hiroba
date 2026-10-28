import type { CostumeHistoryEntry, FolderHistoryEntry } from "../shared/session-port";

/** Each player's history of one kind, kept on the device. Per taiko number, since one device can
 * hold more than one card. */
export interface HistoryStore<Entry> {
  /** The player's entries, newest first; empty when none is kept or what is kept does not read.
   * Rejects only when the store cannot be read at all. */
  load(taikoNo: string): Promise<readonly Entry[]>;
  /** Replaces the player's entries; an empty list is dropped. Rejects when it cannot be written. */
  save(taikoNo: string, entries: readonly Entry[]): Promise<void>;
}

export type CostumeHistoryStore = HistoryStore<CostumeHistoryEntry>;
export type FolderHistoryStore = HistoryStore<FolderHistoryEntry>;
