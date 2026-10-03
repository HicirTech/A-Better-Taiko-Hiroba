import { type CostumeHistoryStore, readCostumeHistory } from "../hiroba-session";
import {
  completed,
  type Database,
  type DatabaseFactory,
  openDatabase,
  succeeded,
} from "./android-indexeddb";

const DATABASE = "abth-costume-history";
const DATABASE_VERSION = 1;
/** The histories, one record for each player, under the taiko number. */
const HISTORIES = "histories";
/** The shape a record is kept in, which a later shape would change. */
const RECORD_VERSION = 1;

/** Android's costume history, in a database of its own apart from the pictures, which an epoch
 * bump clears, and from the undo records. */
export function createIndexedDbHistoryStore(factory: DatabaseFactory): CostumeHistoryStore {
  let opened: Promise<Database> | null = null;
  const database = () => {
    opened ??= openDatabase(factory, DATABASE, DATABASE_VERSION, (created) => {
      created.createObjectStore(HISTORIES);
    }).catch((error: unknown) => {
      // A failed opening is not remembered, so the next call tries again.
      opened = null;
      throw error;
    });
    return opened;
  };
  return {
    async load(taikoNo) {
      const table = (await database()).transaction(HISTORIES, "readonly").objectStore(HISTORIES);
      const stored = await succeeded(table.get(taikoNo));
      return readCostumeHistory(isStored(stored) ? stored.entries : undefined);
    },
    async save(taikoNo, entries) {
      const transaction = (await database()).transaction([HISTORIES], "readwrite");
      const table = transaction.objectStore(HISTORIES);
      if (entries.length === 0) {
        table.delete(taikoNo);
      } else {
        table.put({ v: RECORD_VERSION, entries }, taikoNo);
      }
      await completed(transaction);
    },
  };
}

/** A record as this store keeps one: another version's, or no object at all, reads as none. */
function isStored(value: unknown): value is { readonly entries: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { v?: unknown }).v === RECORD_VERSION &&
    "entries" in value
  );
}
