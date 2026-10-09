import { describe, expect, test } from "bun:test";

import type { PipelineHistory } from "../src/pipelines";
import { createIndexedDbPipelineStores } from "../src/platform/android-pipeline-store";
import { createFakeIndexedDb } from "./indexeddb-fake";

const HISTORY: PipelineHistory = {
  ended: [
    {
      operation: "changeCostume",
      kind: "write",
      startedAt: 1000,
      endedAt: 3100,
      requests: 2,
      outcome: "failed",
      code: "readFailed timedOut",
      at: { index: 2, request: { method: "GET", path: "/mypage_kisekae.php" } },
    },
  ],
  pictures: { came: 5, failed: 0 },
};
const OTHER: PipelineHistory = { ended: [], pictures: { came: 1, failed: 1 } };
const NONE: PipelineHistory = { ended: [], pictures: { came: 0, failed: 0 } };

describe("createIndexedDbPipelineStores", () => {
  test("keeps each pipeline's history apart, for the next stores of the same database", async () => {
    const indexedDb = createFakeIndexedDb();
    const stores = createIndexedDbPipelineStores(indexedDb.factory);
    await stores("io").save(HISTORY);
    await stores("external").save(OTHER);

    const reopened = createIndexedDbPipelineStores(indexedDb.factory);
    expect(await reopened("io").load()).toEqual(HISTORY);
    expect(await reopened("external").load()).toEqual(OTHER);
  });

  test("reads no record, or one of another version, as an empty history", async () => {
    const indexedDb = createFakeIndexedDb();
    const stores = createIndexedDbPipelineStores(indexedDb.factory);
    expect(await stores("io").load()).toEqual(NONE);

    await stores("io").save(HISTORY);
    indexedDb.tables.get("histories")?.set("io", { v: 2, history: HISTORY });
    expect(await stores("io").load()).toEqual(NONE);
  });

  test("opens its database again after an opening failed", async () => {
    const indexedDb = createFakeIndexedDb();
    const stores = createIndexedDbPipelineStores(indexedDb.factory);
    indexedDb.faults.open = true;
    await expect(stores("io").load()).rejects.toBeDefined();

    indexedDb.faults.open = false;
    expect(await stores("io").load()).toEqual(NONE);
  });
});
