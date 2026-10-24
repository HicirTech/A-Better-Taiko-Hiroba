import { isStoredScoreBook, readStoredScoreBook, type ScoresStore } from "../hiroba-session";
import { type DatabaseFactory, lazyDatabase } from "./android-indexeddb";
import { keptRecords } from "./kept-record";

const DATABASE = "abth-scores";
const DATABASE_VERSION = 1;
/** The books, one record for each player, under the taiko number. */
const BOOKS = "books";

/** Android's score books, in a database of their own. */
export function createIndexedDbScoresStore(factory: DatabaseFactory): ScoresStore {
  const database = lazyDatabase(factory, DATABASE, DATABASE_VERSION, (created) => {
    created.createObjectStore(BOOKS);
  });
  const kept = keptRecords(database, BOOKS, "book", isStoredScoreBook);
  return {
    async load(taikoNo) {
      return readStoredScoreBook(await kept.load(taikoNo));
    },
    async save(taikoNo, book) {
      await kept.save(taikoNo, book);
    },
  };
}
