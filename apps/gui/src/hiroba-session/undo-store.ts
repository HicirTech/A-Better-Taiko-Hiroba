import type { UndoSlot } from "@abth/core";

import type { WriteKind, WriteSets } from "../session-port";

/**
 * Each player's undo slot for each kind of write, kept on the device: the last write's record, and
 * a write started and not yet settled. It is what undoes a write after the app is closed, so it is
 * written before a write's first post, and a write whose slot cannot be written is not sent.
 *
 * Slots are kept per player, by taiko number, since one device can be signed in to more than one
 * card: one player's writes never replace, spend or date another's record or pending write.
 *
 * It holds the sets and whose they are (the taiko number), never a token or a cookie, and it
 * never crosses to the window: the interface sees only what `pendingUndo` offers.
 *
 * Both calls are asynchronous so that a store can wait for the platform to confirm: a shell's
 * store is a file on the desktop and a database on Android.
 */
export interface UndoStore {
  /**
   * The player's slot for the kind: an empty one when none is kept, or what is kept is not this
   * player's or does not read (see `readSlot`). Rejects only when the store cannot be read at all.
   */
  load<K extends WriteKind>(kind: K, taikoNo: string): Promise<UndoSlot<WriteSets[K]>>;
  /**
   * Replaces the player's slot for the kind, and leaves every other slot as it is; an empty slot
   * is dropped. Resolves only once the slot is durable, and rejects when it cannot be written.
   */
  save<K extends WriteKind>(kind: K, taikoNo: string, slot: UndoSlot<WriteSets[K]>): Promise<void>;
}
