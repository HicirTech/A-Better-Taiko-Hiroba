import { EMPTY_UNDO_SLOT, type UndoSlot } from "@abth/core";

import { UNDO_SET_GUARDS, type WriteKind, type WriteSets } from "../session-port";

/**
 * What a store read back for a player and a kind: the slot, when it is one as the stores write
 * them and everything in it is the player's own; an empty slot for anything else. Both stores read
 * through here, so a file, a database and a test agree on what counts as a slot.
 */
export function readSlot<K extends WriteKind>(
  kind: K,
  value: unknown,
  taikoNo: string,
): UndoSlot<WriteSets[K]> {
  return isUndoSlot(kind, value) && ownedBy(value, taikoNo) ? value : EMPTY_UNDO_SLOT;
}

/** A slot as a store writes one: a record and a pending write, each none or well formed. */
export function isUndoSlot<K extends WriteKind>(
  kind: K,
  value: unknown,
): value is UndoSlot<WriteSets[K]> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const isSet = UNDO_SET_GUARDS[kind];
  const { record, pending } = value as Record<string, unknown>;
  return (
    (record === null || isRecord(record, isSet)) && (pending === null || isPending(pending, isSet))
  );
}

/** Whether everything in the slot is the player's own, as the stores file it. */
function ownedBy(slot: UndoSlot<unknown>, taikoNo: string): boolean {
  return (
    (slot.record === null || slot.record.taikoNo === taikoNo) &&
    (slot.pending === null || slot.pending.taikoNo === taikoNo)
  );
}

function isRecord(value: unknown, isSet: (set: unknown) => boolean): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.taikoNo === "string" &&
    typeof record.at === "string" &&
    (record.status === "current" || record.status === "stale") &&
    isSet(record.before) &&
    isSet(record.after)
  );
}

function isPending(value: unknown, isSet: (set: unknown) => boolean): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const pending = value as Record<string, unknown>;
  return (
    typeof pending.taikoNo === "string" &&
    typeof pending.at === "string" &&
    (pending.purpose === "change" || pending.purpose === "undo") &&
    isSet(pending.before) &&
    isSet(pending.expectedAfter)
  );
}
