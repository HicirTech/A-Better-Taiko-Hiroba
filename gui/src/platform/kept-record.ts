import { isObject } from "../hiroba-session/recent-plays-store";
import { completed, type Database, succeeded } from "./android-indexeddb";

/** The shape a record is kept in, which a later shape would change. */
const RECORD_VERSION = 1;
/** Where a record that does not read is kept, after its own key. */
const ASIDE = ".unreadable";

export interface KeptRecords {
  /** The data this version kept under `key`, or undefined when none reads. */
  load(key: string): Promise<unknown>;
  /** Keeps `data` under `key`, or drops it for undefined; a later version's record stays. */
  save(key: string, data: unknown): Promise<void>;
}

/** Records of `{ v, [field]: data }` in `table`: one that does not read is kept aside first. */
export function keptRecords(
  database: () => Promise<Database>,
  table: string,
  field: string,
  readable: (data: unknown) => boolean,
): KeptRecords {
  const ownOf = (stored: unknown): { readonly data: unknown } | null =>
    isObject(stored) && stored.v === RECORD_VERSION && field in stored
      ? { data: stored[field] }
      : null;
  return {
    async load(key) {
      const records = (await database()).transaction(table, "readonly").objectStore(table);
      const own = ownOf(await succeeded(records.get(key)));
      return own !== null && readable(own.data) ? own.data : undefined;
    },
    async save(key, data) {
      const transaction = (await database()).transaction([table], "readwrite");
      const records = transaction.objectStore(table);
      const kept = records.get(key);
      // Read and written in one transaction: a write after an await would find it committed.
      kept.onsuccess = () => {
        const stored = kept.result;
        if (isObject(stored) && typeof stored.v === "number" && stored.v > RECORD_VERSION) {
          return;
        }
        const own = ownOf(stored);
        if (stored !== undefined && (own === null || !readable(own.data))) {
          records.put(stored, `${key}${ASIDE}`);
        }
        if (data === undefined) {
          records.delete(key);
        } else {
          records.put({ v: RECORD_VERSION, [field]: data }, key);
        }
      };
      await completed(transaction);
    },
  };
}
