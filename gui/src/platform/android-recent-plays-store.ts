import { type RecentPlaysStore, readStoredRecentPlays } from "../hiroba-session";
import {
  completed,
  type Database,
  type DatabaseFactory,
  openDatabase,
  succeeded,
} from "./android-indexeddb";

const DATABASE = "abth-recent-plays";
const DATABASE_VERSION = 1;
/** The walks, one record for each player, under the taiko number. */
const PLAYS = "plays";
/** The shape a record is kept in, which a later shape would change. */
const RECORD_VERSION = 1;

/** Android's recent plays, in a database of its own apart from pictures and costume history. */
export function createIndexedDbRecentPlaysStore(factory: DatabaseFactory): RecentPlaysStore {
  let opened: Promise<Database> | null = null;
  const database = () => {
    opened ??= openDatabase(factory, DATABASE, DATABASE_VERSION, (created) => {
      created.createObjectStore(PLAYS);
    }).catch((error: unknown) => {
      opened = null;
      throw error;
    });
    return opened;
  };
  return {
    async load(taikoNo) {
      const table = (await database()).transaction(PLAYS, "readonly").objectStore(PLAYS);
      const stored = await succeeded(table.get(taikoNo));
      return readStoredRecentPlays(isStored(stored) ? stored.plays : undefined);
    },
    async save(taikoNo, plays) {
      const transaction = (await database()).transaction([PLAYS], "readwrite");
      const table = transaction.objectStore(PLAYS);
      if (plays.length === 0) {
        table.delete(taikoNo);
      } else {
        table.put({ v: RECORD_VERSION, plays }, taikoNo);
      }
      await completed(transaction);
    },
  };
}

/** A record as this store keeps one: another version's, or no object at all, reads as none. */
function isStored(value: unknown): value is { readonly plays: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { v?: unknown }).v === RECORD_VERSION &&
    "plays" in value
  );
}
