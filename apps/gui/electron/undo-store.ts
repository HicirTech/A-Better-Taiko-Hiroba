import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { type CostumeSet, EMPTY_UNDO_SLOT, type UndoSlot } from "@abth/core";

import { isCostumeSet, type WriteKind } from "../src/session-port";

/**
 * Each kind of write's undo slot on disk, in the app's profile folder: the last write's record,
 * and a write started and not yet settled. It is what undoes a write after the app is closed, so it
 * is written before a write's first post, and a write whose slot cannot be written is not sent.
 *
 * It holds the sets and whose they are (the taiko number), never a token or a cookie, and it
 * never crosses to the window: the interface sees only what `pendingUndo` offers.
 */
export interface UndoStore {
  /** The kind's slot; an empty one when there is none, or the file does not read. */
  load(kind: WriteKind): UndoSlot<CostumeSet>;
  /**
   * Replaces the kind's slot. Written to a temporary file, flushed to the disk, then renamed over
   * the last, so a crash leaves the old file or the new one, never half of one. Throws when it
   * cannot be written.
   */
  save(kind: WriteKind, slot: UndoSlot<CostumeSet>): void;
}

interface StoredUndo {
  readonly version: 1;
  readonly slots: Partial<Record<WriteKind, UndoSlot<CostumeSet>>>;
}

export function createUndoStore(path: string): UndoStore {
  const read = (): StoredUndo => {
    try {
      const stored = JSON.parse(readFileSync(path, "utf8")) as Partial<StoredUndo>;
      return stored.version === 1 && typeof stored.slots === "object" && stored.slots !== null
        ? { version: 1, slots: stored.slots }
        : { version: 1, slots: {} };
    } catch {
      return { version: 1, slots: {} };
    }
  };
  return {
    load(kind) {
      const slot = read().slots[kind];
      return isSlot(slot) ? slot : EMPTY_UNDO_SLOT;
    },
    save(kind, slot) {
      const stored: StoredUndo = { version: 1, slots: { ...read().slots, [kind]: slot } };
      const temporary = `${path}.tmp`;
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(temporary, JSON.stringify(stored), { flush: true });
      renameSync(temporary, path);
    },
  };
}

/** A slot as this store writes one; anything else on disk reads as none. */
function isSlot(value: unknown): value is UndoSlot<CostumeSet> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { record, pending } = value as Record<string, unknown>;
  return (record === null || isRecord(record)) && (pending === null || isPending(pending));
}

function isRecord(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.taikoNo === "string" &&
    typeof record.at === "string" &&
    (record.status === "current" || record.status === "stale") &&
    isCostumeSet(record.before) &&
    isCostumeSet(record.after)
  );
}

function isPending(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const pending = value as Record<string, unknown>;
  return (
    typeof pending.taikoNo === "string" &&
    typeof pending.at === "string" &&
    (pending.purpose === "change" || pending.purpose === "undo") &&
    isCostumeSet(pending.before) &&
    isCostumeSet(pending.expectedAfter)
  );
}
