import { type RecentPlaysStore, readStoredRecentPlays } from "../hiroba-session";
import { type DatabaseFactory, lazyDatabase } from "./android-indexeddb";
import { keptRecords } from "./kept-record";

const DATABASE = "abth-recent-plays";
const DATABASE_VERSION = 1;
/** The walks, one record for each player, under the taiko number. */
const PLAYS = "plays";

/** Android's recent plays, in a database of its own apart from pictures and costume history. */
export function createIndexedDbRecentPlaysStore(factory: DatabaseFactory): RecentPlaysStore {
  const database = lazyDatabase(factory, DATABASE, DATABASE_VERSION, (created) => {
    created.createObjectStore(PLAYS);
  });
  const kept = keptRecords(database, PLAYS, "plays", Array.isArray);
  return {
    async load(taikoNo) {
      return readStoredRecentPlays(await kept.load(taikoNo));
    },
    async save(taikoNo, plays) {
      await kept.save(taikoNo, plays.length === 0 ? undefined : plays);
    },
  };
}
