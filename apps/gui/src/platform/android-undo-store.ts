import { readSlot, type UndoStore } from "../hiroba-session";
import type { WriteKind } from "../session-port";
import {
  completed,
  type Database,
  type DatabaseFactory,
  openDatabase,
  succeeded,
} from "./android-indexeddb";

const DATABASE = "abth-undo";
const DATABASE_VERSION = 1;
/** The slots, one record for each kind and player, under `<kind>/<taiko number>`. */
const SLOTS = "slots";
/** The shape a record is kept in, which a later shape would change. */
const RECORD_VERSION = 1;

/** Android's undo store, in its own database apart from the pictures, which an epoch bump clears.
 * It fails closed: no copy in memory, since a record that would not survive a kill is no record. */
export function createIndexedDbUndoStore(factory: DatabaseFactory): UndoStore {
  let opened: Promise<Database> | null = null;
  const database = () => {
    opened ??= openDatabase(factory, DATABASE, DATABASE_VERSION, (created) => {
      created.createObjectStore(SLOTS);
    }).catch((error: unknown) => {
      // A failed opening is not remembered, so the next call tries again.
      opened = null;
      throw error;
    });
    return opened;
  };
  const keyOf = (kind: WriteKind, taikoNo: string) => `${kind}/${taikoNo}`;
  return {
    async load(kind, taikoNo) {
      const table = (await database()).transaction(SLOTS, "readonly").objectStore(SLOTS);
      const stored = await succeeded(table.get(keyOf(kind, taikoNo)));
      return readSlot(kind, isStored(stored) ? stored.slot : undefined, taikoNo);
    },
    async save(kind, taikoNo, slot) {
      // Strict durability: the write this record guards is not sent until its bytes are stored.
      const transaction = (await database()).transaction([SLOTS], "readwrite", {
        durability: "strict",
      });
      const table = transaction.objectStore(SLOTS);
      if (slot.record === null && slot.pending === null) {
        table.delete(keyOf(kind, taikoNo));
      } else {
        table.put({ v: RECORD_VERSION, slot }, keyOf(kind, taikoNo));
      }
      await completed(transaction);
    },
  };
}

/** A record as this store keeps one: another version's, or no object at all, reads as none. */
function isStored(value: unknown): value is { readonly slot: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { v?: unknown }).v === RECORD_VERSION &&
    "slot" in value
  );
}
