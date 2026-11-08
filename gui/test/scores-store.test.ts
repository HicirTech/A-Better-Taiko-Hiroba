import { describe, expect, test } from "bun:test";
import { EMPTY_SCORE_BOOK } from "@abth/core";

import { BOOK, CHANGES, LOG } from "../../core/test/kept-fixtures";
import { keptFileStore } from "../electron/kept-file-store";
import type { StoreFiles } from "../electron/replace-file";
import { KEPT_SCORE_CHANGES, KEPT_SCORES, keptMemoryStore } from "../src/hiroba-session";
import { keptIndexedDbStore } from "../src/platform/kept-indexeddb-store";
import { createFakeIndexedDb } from "./indexeddb-fake";

const PLAYER = "000000000000";
const OTHER = "111111111111";

/** Files in memory, as the desktop store writes them. */
function fakeFiles() {
  const disk = new Map<string, string>();
  const files = {
    mkdirSync: () => undefined,
    readFileSync: (path: string) => {
      const text = disk.get(path);
      if (text === undefined) {
        throw Object.assign(new Error(`ENOENT ${path}`), { code: "ENOENT" });
      }
      return text;
    },
    writeFileSync: (path: string, data: string) => {
      disk.set(path, data);
    },
    renameSync: (from: string, to: string) => {
      disk.set(to, disk.get(from) ?? "");
      disk.delete(from);
    },
  } as unknown as StoreFiles;
  return { files, disk };
}

describe("the score stores", () => {
  test("the desktop's keeps each player's book in one file, across stores", async () => {
    const { files } = fakeFiles();
    await keptFileStore("", KEPT_SCORES, files).save(PLAYER, BOOK);
    await keptFileStore("", KEPT_SCORES, files).save(OTHER, EMPTY_SCORE_BOOK);

    const store = keptFileStore("", KEPT_SCORES, files);
    expect(await store.load(PLAYER)).toEqual(BOOK);
    expect(await store.load(OTHER)).toEqual(EMPTY_SCORE_BOOK);
  });

  test("Android's keeps each player's book in a database of its own", async () => {
    const indexedDb = createFakeIndexedDb();
    await keptIndexedDbStore(indexedDb.factory, KEPT_SCORES).save(PLAYER, BOOK);

    expect(await keptIndexedDbStore(indexedDb.factory, KEPT_SCORES).load(PLAYER)).toEqual(BOOK);
    expect(await keptIndexedDbStore(indexedDb.factory, KEPT_SCORES).load(OTHER)).toEqual(
      EMPTY_SCORE_BOOK,
    );
    expect([...indexedDb.tables.keys()]).toEqual(["books"]);
  });

  test("the logs of changes: none until saved, then each player's own, on every platform", async () => {
    const { files } = fakeFiles();
    const indexedDb = createFakeIndexedDb();
    const stores = [
      () => keptMemoryStore(KEPT_SCORE_CHANGES),
      () => keptFileStore("", KEPT_SCORE_CHANGES, files),
      () => keptIndexedDbStore(indexedDb.factory, KEPT_SCORE_CHANGES),
    ];
    const memory = keptMemoryStore(KEPT_SCORE_CHANGES);
    for (const storeOf of stores) {
      const store = storeOf === stores[0] ? memory : storeOf();
      expect(await store.load(PLAYER)).toBeNull();
      await store.save(PLAYER, LOG);
      await store.save(OTHER, { baselined: false, changes: [] });
      const again = storeOf === stores[0] ? memory : storeOf();
      expect(await again.load(PLAYER)).toEqual(LOG);
      expect(await again.load(OTHER)).toEqual({ baselined: false, changes: [] });
    }
    expect([...indexedDb.tables.keys()]).toEqual(["changes"]);
  });

  test("a log from a build that kept no hits reads until a save, and stays as it was", async () => {
    const { files } = fakeFiles();
    const earlier = { baselined: true, changes: [CHANGES[0]] };
    files.writeFileSync(
      "score-changes.json",
      JSON.stringify({ version: 1, players: { [PLAYER]: earlier } }),
    );
    const store = keptFileStore("", KEPT_SCORE_CHANGES, files);
    expect((await store.load(PLAYER))?.changes).toHaveLength(1);
    await store.save(PLAYER, LOG);
    expect((await store.load(PLAYER))?.changes).toEqual(CHANGES);
    const left = JSON.parse(files.readFileSync("score-changes.json", "utf8"));
    expect(left.players[PLAYER].changes).toHaveLength(1);
  });
});
