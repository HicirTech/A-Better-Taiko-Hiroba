/**
 * A stand-in for the page's IndexedDB, as much of it as the Android picture store uses: open with
 * one upgrade, and get, put and clear in transactions that complete once their requests have,
 * each answered on a later turn as the real one does. Values are copied in and out, as structured
 * clone copies them. Its tables outlive a database opened on them, so opening it again is a
 * relaunch.
 */
import type {
  DatabaseHandler,
  DatabaseTable,
  DatabaseTransaction,
  PictureDatabase,
  PictureDatabaseFactory,
} from "../src/platform/android-picture-store";

interface FakeRequest {
  result: unknown;
  error: unknown;
  onsuccess: DatabaseHandler;
  onerror: DatabaseHandler;
}

interface FakeTransaction extends DatabaseTransaction {
  error: unknown;
}

export interface FakeIndexedDb {
  readonly factory: PictureDatabaseFactory;
  /** Each table's records, by key: what a store left for the next opening. */
  readonly tables: Map<string, Map<string, unknown>>;
  /** Set to make every opening fail from now on, or every write. */
  readonly faults: { open: boolean; writes: boolean };
}

export function createFakeIndexedDb(): FakeIndexedDb {
  const tables = new Map<string, Map<string, unknown>>();
  const faults = { open: false, writes: false };
  let created = false;

  const newTransaction = (): DatabaseTransaction => {
    let pending = 0;
    let ended = false;
    const request = (run: () => unknown): FakeRequest => {
      const asked: FakeRequest = { result: undefined, error: null, onsuccess: null, onerror: null };
      pending += 1;
      setTimeout(() => {
        if (ended) {
          return;
        }
        try {
          asked.result = run();
        } catch (error) {
          ended = true;
          asked.error = error;
          transaction.error = error;
          asked.onerror?.();
          transaction.onabort?.();
          return;
        }
        asked.onsuccess?.();
        pending -= 1;
        if (pending === 0) {
          ended = true;
          transaction.oncomplete?.();
        }
      });
      return asked;
    };
    const tableOf = (name: string): DatabaseTable => {
      const table = tables.get(name);
      if (table === undefined) {
        throw new Error(`No table ${name}`);
      }
      return {
        get: (key) => request(() => structuredClone(table.get(key))),
        put: (value, key) =>
          request(() => {
            if (faults.writes) {
              throw new Error("QuotaExceededError");
            }
            table.set(key, structuredClone(value));
          }),
        clear: () => request(() => table.clear()),
      };
    };
    const transaction: FakeTransaction = {
      error: null,
      oncomplete: null,
      onerror: null,
      onabort: null,
      objectStore: tableOf,
    };
    return transaction;
  };

  const database: PictureDatabase = {
    createObjectStore: (name) => tables.set(name, new Map()),
    transaction: () => newTransaction(),
  };

  const factory: PictureDatabaseFactory = {
    open: () => {
      const asked = {
        result: database,
        error: null as unknown,
        onsuccess: null as DatabaseHandler,
        onerror: null as DatabaseHandler,
        onupgradeneeded: null as DatabaseHandler,
        onblocked: null as DatabaseHandler,
      };
      setTimeout(() => {
        if (faults.open) {
          asked.error = new Error("UnknownError");
          asked.onerror?.();
          return;
        }
        if (!created) {
          created = true;
          asked.onupgradeneeded?.();
        }
        asked.onsuccess?.();
      });
      return asked;
    },
  };

  return { factory, tables, faults };
}
