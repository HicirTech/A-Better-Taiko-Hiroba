import { readStoredScoreChanges, type ScoreChangesStore } from "../hiroba-session";
import { completed, type DatabaseFactory, lazyDatabase, succeeded } from "./android-indexeddb";

const DATABASE = "abth-score-changes";
const DATABASE_VERSION = 1;
/** The logs, one record for each player, under the taiko number. */
const LOGS = "changes";
/** The shape a record is kept in, which a later shape would change. */
const RECORD_VERSION = 1;

/** Android's logs of what reads of scores changed, in a database of their own. */
export function createIndexedDbScoreChangesStore(factory: DatabaseFactory): ScoreChangesStore {
  const database = lazyDatabase(factory, DATABASE, DATABASE_VERSION, (created) => {
    created.createObjectStore(LOGS);
  });
  return {
    async load(taikoNo) {
      const table = (await database()).transaction(LOGS, "readonly").objectStore(LOGS);
      const stored = await succeeded(table.get(taikoNo));
      return readStoredScoreChanges(isStored(stored) ? stored.log : undefined);
    },
    async save(taikoNo, log) {
      const transaction = (await database()).transaction([LOGS], "readwrite");
      transaction.objectStore(LOGS).put({ v: RECORD_VERSION, log }, taikoNo);
      await completed(transaction);
    },
  };
}

/** A record as this store keeps one: another version's, or no object at all, reads as none. */
function isStored(value: unknown): value is { readonly log: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { v?: unknown }).v === RECORD_VERSION &&
    "log" in value
  );
}
