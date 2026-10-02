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

/**
 * Android's undo store (see `UndoStore`): a database of its own in the app page's IndexedDB,
 * `abth-undo`, apart from the pictures, which a new `PICTURE_EPOCH` clears. An undo record is
 * never a cache, and the user's own say when it goes: an undo, or the app's data.
 *
 * A save resolves only when its transaction has completed, and asks the browser to confirm the
 * bytes reached storage (`durability: "strict"`), since the write it guards is not sent until then
 * and the record has to outlive an app that is swiped away or killed mid-write.
 *
 * It fails closed. A database that will not open, or a slot that cannot be written, rejects the
 * call, and there is no copy in memory to fall back on: a record that would not survive a kill is
 * no record, and the write it guards is then not sent. A failed opening is not remembered, so the
 * next call tries again.
 *
 * What it keeps is the sets and whose they are, never a token or a cookie.
 */
export function createIndexedDbUndoStore(factory: DatabaseFactory): UndoStore {
  let opened: Promise<Database> | null = null;
  const database = () => {
    opened ??= openDatabase(factory, DATABASE, DATABASE_VERSION, (created) => {
      created.createObjectStore(SLOTS);
    }).catch((error: unknown) => {
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
