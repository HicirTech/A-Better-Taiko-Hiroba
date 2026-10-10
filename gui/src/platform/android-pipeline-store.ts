import { type PipelineHistoryStore, readPipelineHistory } from "../pipelines";
import { completed, type DatabaseFactory, lazyDatabase, succeeded } from "./android-indexeddb";

const DATABASE = "abth-pipelines";
const DATABASE_VERSION = 1;
/** The histories, one record for each pipeline, under its name. */
const HISTORIES = "histories";
/** The shape a record is kept in, which a later shape would change. */
const RECORD_VERSION = 1;

/** Android's pipeline histories, in a database of their own: each pipeline's store by its name. */
export function createIndexedDbPipelineStores(
  factory: DatabaseFactory,
): (pipeline: string) => PipelineHistoryStore {
  const database = lazyDatabase(factory, DATABASE, DATABASE_VERSION, (created) => {
    created.createObjectStore(HISTORIES);
  });
  return (pipeline) => ({
    async load() {
      const table = (await database()).transaction(HISTORIES, "readonly").objectStore(HISTORIES);
      const stored = await succeeded(table.get(pipeline));
      return readPipelineHistory(isStored(stored) ? stored.history : undefined);
    },
    async save(history) {
      const transaction = (await database()).transaction([HISTORIES], "readwrite");
      transaction.objectStore(HISTORIES).put({ v: RECORD_VERSION, history }, pipeline);
      await completed(transaction);
    },
  });
}

/** A record as this store keeps one: another version's, or no object at all, reads as none. */
function isStored(value: unknown): value is { readonly history: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { v?: unknown }).v === RECORD_VERSION &&
    "history" in value
  );
}
