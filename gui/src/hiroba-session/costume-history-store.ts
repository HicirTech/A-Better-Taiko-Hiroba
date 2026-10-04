import type { CostumeHistoryEntry } from "../session-port";

/** Each player's costume history, kept on the device. Per taiko number, since one device can hold
 * more than one card. */
export interface CostumeHistoryStore {
  /** The player's entries, newest first; empty when none is kept or what is kept does not read.
   * Rejects only when the store cannot be read at all. */
  load(taikoNo: string): Promise<readonly CostumeHistoryEntry[]>;
  /** Replaces the player's entries; an empty list is dropped. Rejects when it cannot be written. */
  save(taikoNo: string, entries: readonly CostumeHistoryEntry[]): Promise<void>;
}
