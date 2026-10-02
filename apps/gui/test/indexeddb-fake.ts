/**
 * A stand-in for the page's IndexedDB, as much of it as Android's stores use: open with one upgrade
 * for each database, and get, put, delete and clear in transactions that complete once their
 * requests have, each answered on a later turn as the real one does. Values are copied in and out,
 * as structured clone copies them. Its tables outlive a database opened on them, so opening it
 * again is a relaunch.
 */
import type {
  Database,
  DatabaseFactory,
  DatabaseHandler,
  DatabaseTable,
  DatabaseTransaction,
  TransactionOptions,
} from "../src/platform/android-indexeddb";

interface FakeRequest {
  result: unknown;
  error: unknown;
  onsuccess: DatabaseHandler;
  onerror: DatabaseHandler;
}

interface FakeTransaction extends DatabaseTransaction {
  error: unknown;
}

/** A transaction as it was asked for: which tables, in which mode, and how durable. */
export interface AskedTransaction {
  readonly names: readonly string[];
  readonly mode: "readonly" | "readwrite";
  readonly durability: TransactionOptions["durability"];
}

export interface FakeIndexedDb {
  readonly factory: DatabaseFactory;
  /** Each table's records, by key: what a store left for the next opening. */
  readonly tables: Map<string, Map<string, unknown>>;
  /** Set to make every opening fail from now on, or every write. */
  readonly faults: { open: boolean; writes: boolean };
  /** Every transaction asked for, in order. */
  readonly transactions: AskedTransaction[];
}

export function createFakeIndexedDb(): FakeIndexedDb {
  const tables = new Map<string, Map<string, unknown>>();
  const faults = { open: false, writes: false };
  const transactions: AskedTransaction[] = [];
  const created = new Set<string>();

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
    const written = (change: () => void) =>
      request(() => {
        if (faults.writes) {
          throw new Error("QuotaExceededError");
        }
        change();
      });
    const tableOf = (name: string): DatabaseTable => {
      const table = tables.get(name);
      if (table === undefined) {
        throw new Error(`No table ${name}`);
      }
      return {
        get: (key) => request(() => structuredClone(table.get(key))),
        put: (value, key) => written(() => table.set(key, structuredClone(value))),
        delete: (key) => written(() => table.delete(key)),
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

  const database: Database = {
    createObjectStore: (name) => tables.set(name, new Map()),
    transaction: (names, mode, options) => {
      transactions.push({
        names: typeof names === "string" ? [names] : names,
        mode,
        durability: options?.durability,
      });
      return newTransaction();
    },
  };

  const factory: DatabaseFactory = {
    open: (name) => {
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
        if (!created.has(name)) {
          created.add(name);
          asked.onupgradeneeded?.();
        }
        asked.onsuccess?.();
      });
      return asked;
    },
  };

  return { factory, tables, faults, transactions };
}
