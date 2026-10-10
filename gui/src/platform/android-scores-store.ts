import { readStoredScoreBook, type ScoresStore } from "../hiroba-session";
import { completed, type DatabaseFactory, lazyDatabase, succeeded } from "./android-indexeddb";

const DATABASE = "abth-scores";
const DATABASE_VERSION = 1;
/** The books, one record for each player, under the taiko number. */
const BOOKS = "books";
/** The shape a record is kept in, which a later shape would change. */
const RECORD_VERSION = 1;

/** Android's score books, in a database of their own. */
export function createIndexedDbScoresStore(factory: DatabaseFactory): ScoresStore {
  const database = lazyDatabase(factory, DATABASE, DATABASE_VERSION, (created) => {
    created.createObjectStore(BOOKS);
  });
  return {
    async load(taikoNo) {
      const table = (await database()).transaction(BOOKS, "readonly").objectStore(BOOKS);
      const stored = await succeeded(table.get(taikoNo));
      return readStoredScoreBook(isStored(stored) ? stored.book : undefined);
    },
    async save(taikoNo, book) {
      const transaction = (await database()).transaction([BOOKS], "readwrite");
      transaction.objectStore(BOOKS).put({ v: RECORD_VERSION, book }, taikoNo);
      await completed(transaction);
    },
  };
}

/** A record as this store keeps one: another version's, or no object at all, reads as none. */
function isStored(value: unknown): value is { readonly book: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { v?: unknown }).v === RECORD_VERSION &&
    "book" in value
  );
}
