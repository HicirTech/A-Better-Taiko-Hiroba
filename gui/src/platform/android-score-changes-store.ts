import { readStoredScoreChanges, type ScoreChangesStore } from "../hiroba-session";
import { type DatabaseFactory, lazyDatabase } from "./android-indexeddb";
import { keptRecords } from "./kept-record";

const DATABASE = "abth-score-changes";
const DATABASE_VERSION = 1;
/** The logs, one record for each player, under the taiko number. */
const LOGS = "changes";

/** Android's logs of what reads of scores changed, in a database of their own. */
export function createIndexedDbScoreChangesStore(factory: DatabaseFactory): ScoreChangesStore {
  const database = lazyDatabase(factory, DATABASE, DATABASE_VERSION, (created) => {
    created.createObjectStore(LOGS);
  });
  const kept = keptRecords(database, LOGS, "log", (log) => readStoredScoreChanges(log) !== null);
  return {
    async load(taikoNo) {
      return readStoredScoreChanges(await kept.load(taikoNo));
    },
    async save(taikoNo, log) {
      await kept.save(taikoNo, log);
    },
  };
}
