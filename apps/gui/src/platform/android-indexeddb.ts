// The slice of IndexedDB Android's stores use, kept small so a test's stand-in stays small.

/** A handler IndexedDB calls with an event, which the stores never read. */
export type DatabaseHandler = ((...event: never[]) => unknown) | null;

export interface DatabaseRequest<T> {
  readonly result: T;
  readonly error: unknown;
  onsuccess: DatabaseHandler;
  onerror: DatabaseHandler;
}

export interface DatabaseOpenRequest extends DatabaseRequest<Database> {
  onupgradeneeded: DatabaseHandler;
  onblocked: DatabaseHandler;
}

export interface DatabaseTable {
  get(key: string): DatabaseRequest<unknown>;
  put(value: unknown, key: string): unknown;
  delete(key: string): unknown;
  clear(): unknown;
}

export interface DatabaseTransaction {
  readonly error: unknown;
  oncomplete: DatabaseHandler;
  onerror: DatabaseHandler;
  onabort: DatabaseHandler;
  objectStore(name: string): DatabaseTable;
}

export interface TransactionOptions {
  /** `strict` asks the browser to confirm the write reached storage before it reports it done. */
  readonly durability?: "default" | "strict" | "relaxed";
}

export interface Database {
  createObjectStore(name: string): unknown;
  transaction(
    names: string | string[],
    mode: "readonly" | "readwrite",
    options?: TransactionOptions,
  ): DatabaseTransaction;
}

export interface DatabaseFactory {
  open(name: string, version: number): DatabaseOpenRequest;
}

/** Opens the database, creating it with `upgrade` the first time. Rejects when it cannot be opened
 * or an older version is still open elsewhere: that is not waited for, as it may never close. */
export function openDatabase(
  factory: DatabaseFactory,
  name: string,
  version: number,
  upgrade: (database: Database) => void,
): Promise<Database> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, version);
    request.onupgradeneeded = () => upgrade(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("blocked"));
  });
}

export function succeeded<T>(request: DatabaseRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Settles once the transaction has completed: every request of it done and written. */
export function completed(transaction: DatabaseTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
