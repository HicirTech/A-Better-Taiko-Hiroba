import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { type CostumeSet, EMPTY_UNDO_SLOT, type UndoSlot } from "@abth/core";

import { isCostumeSet, WRITE_KINDS, type WriteKind } from "../src/session-port";

/**
 * Each player's undo slot for each kind of write, on disk, in the app's profile folder: the last
 * write's record, and a write started and not yet settled. It is what undoes a write after the app
 * is closed, so it is written before a write's first post, and a write whose slot cannot be written
 * is not sent.
 *
 * Slots are kept per player, by taiko number, since one device can be signed in to more than one
 * card: one player's writes never replace, spend or date another's record or pending write.
 *
 * It holds the sets and whose they are (the taiko number), never a token or a cookie, and it
 * never crosses to the window: the interface sees only what `pendingUndo` offers.
 */
export interface UndoStore {
  /** The player's slot for the kind; an empty one when there is none, or the file does not read. */
  load(kind: WriteKind, taikoNo: string): UndoSlot<CostumeSet>;
  /**
   * Replaces the player's slot for the kind, and leaves every other slot as it is; an empty slot
   * is dropped. Written to a temporary file, flushed to the disk, then renamed over the last, so a
   * crash leaves the old file or the new one, never half of one. Throws when it cannot be written.
   */
  save(kind: WriteKind, taikoNo: string, slot: UndoSlot<CostumeSet>): void;
}

type Slots = Partial<Record<WriteKind, Record<string, UndoSlot<CostumeSet>>>>;

interface StoredUndo {
  readonly version: 2;
  /** By kind, then by taiko number. */
  readonly slots: Slots;
}

export function createUndoStore(path: string): UndoStore {
  const read = (): Slots => {
    try {
      const stored = JSON.parse(readFileSync(path, "utf8")) as {
        version?: unknown;
        slots?: unknown;
      };
      if (!isObject(stored.slots)) {
        return {};
      }
      if (stored.version === 2) {
        return kindsOf(stored.slots);
      }
      return stored.version === 1 ? byPlayer(stored.slots) : {};
    } catch {
      return {};
    }
  };
  return {
    load(kind, taikoNo) {
      const players = read()[kind] ?? {};
      const slot = Object.hasOwn(players, taikoNo) ? players[taikoNo] : undefined;
      return isSlot(slot) && ownedBy(slot, taikoNo) ? slot : EMPTY_UNDO_SLOT;
    },
    save(kind, taikoNo, slot) {
      const slots = read();
      const players = { ...slots[kind] };
      if (slot.record === null && slot.pending === null) {
        delete players[taikoNo];
      } else {
        players[taikoNo] = slot;
      }
      const stored: StoredUndo = { version: 2, slots: { ...slots, [kind]: players } };
      const temporary = `${path}.tmp`;
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(temporary, JSON.stringify(stored), { flush: true });
      renameSync(temporary, path);
    },
  };
}

/** The known kinds of a file of this version, each a map of players; anything else is left out. */
function kindsOf(slots: Record<string, unknown>): Slots {
  const kept: Slots = {};
  for (const kind of WRITE_KINDS) {
    const players = slots[kind];
    if (isObject(players)) {
      kept[kind] = players as Record<string, UndoSlot<CostumeSet>>;
    }
  }
  return kept;
}

/**
 * A file of the first version, which kept one slot per kind whoever it was for, as a slot per
 * player: the record goes to its player, and the pending write to its own.
 */
function byPlayer(slots: Record<string, unknown>): Slots {
  const kept: Slots = {};
  for (const kind of WRITE_KINDS) {
    const slot = slots[kind];
    if (!isSlot(slot)) {
      continue;
    }
    const players: Record<string, UndoSlot<CostumeSet>> = {};
    if (slot.record !== null) {
      players[slot.record.taikoNo] = { record: slot.record, pending: null };
    }
    if (slot.pending !== null) {
      const whose = slot.pending.taikoNo;
      players[whose] = { record: players[whose]?.record ?? null, pending: slot.pending };
    }
    kept[kind] = players;
  }
  return kept;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Whether everything in the slot is the player's own, as this store files it. */
function ownedBy(slot: UndoSlot<CostumeSet>, taikoNo: string): boolean {
  return (
    (slot.record === null || slot.record.taikoNo === taikoNo) &&
    (slot.pending === null || slot.pending.taikoNo === taikoNo)
  );
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
