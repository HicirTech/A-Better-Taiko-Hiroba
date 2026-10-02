import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { UndoSlot } from "@abth/core";

import { isUndoSlot, readSlot, type UndoStore } from "../src/hiroba-session";
import { WRITE_KINDS, type WriteKind, type WriteSets } from "../src/session-port";

/** What a file holds under each kind and player before a slot read from it is checked. */
type Slots = Partial<Record<WriteKind, Record<string, unknown>>>;

interface StoredUndo {
  readonly version: 2;
  /** By kind, then by taiko number. */
  readonly slots: Slots;
}

/**
 * The desktop's undo store (see `UndoStore`): one file, in the app's profile folder. A slot is
 * written to a temporary file, flushed to the disk, then renamed over the last, so a crash leaves
 * the old file or the new one, never half of one.
 */
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
    async load(kind, taikoNo) {
      const players: Record<string, unknown> = read()[kind] ?? {};
      return readSlot(
        kind,
        Object.hasOwn(players, taikoNo) ? players[taikoNo] : undefined,
        taikoNo,
      );
    },
    async save(kind, taikoNo, slot) {
      const slots = read();
      const players: Record<string, unknown> = { ...slots[kind] };
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
      kept[kind] = players;
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
    if (!isUndoSlot(kind, slot)) {
      continue;
    }
    const players: Record<string, UndoSlot<WriteSets[WriteKind]>> = {};
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
