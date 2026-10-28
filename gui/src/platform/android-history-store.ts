import {
  type CostumeHistoryStore,
  type FolderHistoryStore,
  type HistoryStore,
  readCostumeHistory,
  readFolderHistory,
} from "../hiroba-session";
import { type DatabaseFactory, lazyDatabase } from "./android-indexeddb";
import { keptRecords } from "./kept-record";

const DATABASE_VERSION = 1;
/** The histories, one record for each player, under the taiko number. */
const HISTORIES = "histories";

/** Android's costume history, in a database of its own apart from the pictures, which an epoch
 * bump clears. */
export function createIndexedDbHistoryStore(factory: DatabaseFactory): CostumeHistoryStore {
  return historyDatabase(factory, "abth-costume-history", readCostumeHistory);
}

/** Android's folder history, in a database of its own as the costume's is. */
export function createIndexedDbFolderHistoryStore(factory: DatabaseFactory): FolderHistoryStore {
  return historyDatabase(factory, "abth-folder-history", readFolderHistory);
}

function historyDatabase<Entry>(
  factory: DatabaseFactory,
  name: string,
  read: (stored: unknown) => Entry[],
): HistoryStore<Entry> {
  const database = lazyDatabase(factory, name, DATABASE_VERSION, (created) => {
    created.createObjectStore(HISTORIES);
  });
  const kept = keptRecords(database, HISTORIES, "entries", Array.isArray);
  return {
    async load(taikoNo) {
      return read(await kept.load(taikoNo));
    },
    async save(taikoNo, entries) {
      await kept.save(taikoNo, entries.length === 0 ? undefined : entries);
    },
  };
}
