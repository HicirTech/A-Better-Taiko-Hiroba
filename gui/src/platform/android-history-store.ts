import { type CostumeHistoryStore, readCostumeHistory } from "../hiroba-session";
import { type DatabaseFactory, lazyDatabase } from "./android-indexeddb";
import { keptRecords } from "./kept-record";

const DATABASE = "abth-costume-history";
const DATABASE_VERSION = 1;
/** The histories, one record for each player, under the taiko number. */
const HISTORIES = "histories";

/** Android's costume history, in a database of its own apart from the pictures, which an epoch
 * bump clears. */
export function createIndexedDbHistoryStore(factory: DatabaseFactory): CostumeHistoryStore {
  const database = lazyDatabase(factory, DATABASE, DATABASE_VERSION, (created) => {
    created.createObjectStore(HISTORIES);
  });
  const kept = keptRecords(database, HISTORIES, "entries", Array.isArray);
  return {
    async load(taikoNo) {
      return readCostumeHistory(await kept.load(taikoNo));
    },
    async save(taikoNo, entries) {
      await kept.save(taikoNo, entries.length === 0 ? undefined : entries);
    },
  };
}
