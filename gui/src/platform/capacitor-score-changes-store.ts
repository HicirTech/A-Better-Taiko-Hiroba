import { readStoredScoreChanges, type ScoreChangesStore } from "../hiroba-session";
import { type DatabaseFactory, lazyDatabase } from "./capacitor-indexeddb";
import { keptRecords } from "./kept-record";

const DATABASE = "abth-score-changes-2";
/** Where builds that logged no hits keep theirs: read until a save, and left as it is. */
const EARLIER_DATABASE = "abth-score-changes";
const DATABASE_VERSION = 1;
/** The logs, one record for each player, under the taiko number. */
const LOGS = "changes";

/** Android's logs of what reads of scores changed, in a database of their own. */
export function createIndexedDbScoreChangesStore(factory: DatabaseFactory): ScoreChangesStore {
  const logs = (name: string) =>
    keptRecords(
      lazyDatabase(factory, name, DATABASE_VERSION, (created) => {
        created.createObjectStore(LOGS);
      }),
      LOGS,
      "log",
      (log) => readStoredScoreChanges(log) !== null,
    );
  const kept = logs(DATABASE);
  const earlier = logs(EARLIER_DATABASE);
  return {
    async load(taikoNo) {
      return readStoredScoreChanges((await kept.load(taikoNo)) ?? (await earlier.load(taikoNo)));
    },
    async save(taikoNo, log) {
      await kept.save(taikoNo, log);
    },
  };
}
