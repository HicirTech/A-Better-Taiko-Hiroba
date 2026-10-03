import type { UndoSlot } from "@abth/core";

import type { WriteKind, WriteSets } from "../session-port";

/** Each player's undo slot per kind of write, kept on the device: the last record and a pending
 * write. Per taiko number, since one device can hold more than one card. */
export interface UndoStore {
  /** The player's slot for the kind; empty when none is kept, or it is another's or does not read.
   * Rejects only when the store cannot be read at all. */
  load<K extends WriteKind>(kind: K, taikoNo: string): Promise<UndoSlot<WriteSets[K]>>;
  /** Replaces the player's slot for the kind; an empty slot is dropped. Resolves once the slot is
   * durable, and rejects when it cannot be written, which stops the write unsent. */
  save<K extends WriteKind>(kind: K, taikoNo: string, slot: UndoSlot<WriteSets[K]>): Promise<void>;
}
