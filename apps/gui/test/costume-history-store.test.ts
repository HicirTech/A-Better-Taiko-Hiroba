import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { createCostumeHistoryStore } from "../electron/costume-history-store";
import type { UndoFiles } from "../electron/undo-store";
import { MAX_COSTUME_HISTORY } from "../src/hiroba-session/costume-history";
import { entryOf, pictureOf, SET } from "./history-fixtures";

const PLAYER = "000000000000";
const OTHER = "111111111111";
const PATH = join("data", "costume-history.json");

/** Files in memory, which record what the store did to them and can refuse a rename. */
function fakeFiles(contents: Record<string, string> = {}) {
  const disk = new Map(Object.entries(contents));
  const calls: string[] = [];
  const refuse = { rename: false };
  const files = {
    mkdirSync: (path: string) => {
      calls.push(`mkdir ${path}`);
    },
    readFileSync: (path: string) => {
      const text = disk.get(path);
      if (text === undefined) {
        throw new Error(`ENOENT ${path}`);
      }
      return text;
    },
    writeFileSync: (path: string, data: string, options: unknown) => {
      calls.push(`write ${basename(path)} ${JSON.stringify(options)}`);
      disk.set(path, data);
    },
    renameSync: (from: string, to: string) => {
      if (refuse.rename) {
        throw new Error("EPERM");
      }
      calls.push(`rename ${basename(from)} ${basename(to)}`);
      disk.set(to, disk.get(from) ?? "");
      disk.delete(from);
    },
  } as unknown as UndoFiles;
  return { files, disk, calls, refuse };
}

const KEPT = [entryOf(1, pictureOf("one")), entryOf(2)];

describe("createCostumeHistoryStore", () => {
  test("reads an empty history when nothing was kept", async () => {
    const { files } = fakeFiles();

    expect(await createCostumeHistoryStore(PATH, files).load(PLAYER)).toEqual([]);
  });

  test("keeps a history across stores, as across launches", async () => {
    const { files } = fakeFiles();
    await createCostumeHistoryStore(PATH, files).save(PLAYER, KEPT);

    expect(await createCostumeHistoryStore(PATH, files).load(PLAYER)).toEqual(KEPT);
  });

  test("writes to a temporary file, flushed to the disk, and only then renames it over the last", async () => {
    const { files, calls, disk } = fakeFiles();

    await createCostumeHistoryStore(PATH, files).save(PLAYER, KEPT);

    expect(calls).toEqual([
      "mkdir data",
      'write costume-history.json.tmp {"flush":true}',
      "rename costume-history.json.tmp costume-history.json",
    ]);
    expect([...disk.keys()]).toEqual([PATH]);
  });

  test("keeps each player's history apart, and drops one left empty", async () => {
    const { files, disk } = fakeFiles();
    const store = createCostumeHistoryStore(PATH, files);
    const theirs = [entryOf(7, pictureOf("seven"))];
    await store.save(PLAYER, KEPT);
    await store.save(OTHER, theirs);

    expect(await store.load(PLAYER)).toEqual(KEPT);
    expect(await store.load(OTHER)).toEqual(theirs);

    await store.save(PLAYER, []);

    expect(await store.load(PLAYER)).toEqual([]);
    expect(await store.load(OTHER)).toEqual(theirs);
    expect(JSON.parse(disk.get(PATH) ?? "")).toEqual({ version: 1, players: { [OTHER]: theirs } });
  });

  test("keeps no token, no URL and nothing but the sets and their pictures", async () => {
    const { files, disk } = fakeFiles();

    await createCostumeHistoryStore(PATH, files).save(PLAYER, KEPT);

    expect(Object.keys(JSON.parse(disk.get(PATH) ?? ""))).toEqual(["version", "players"]);
    expect(JSON.parse(disk.get(PATH) ?? "").players[PLAYER]).toEqual(KEPT);
  });

  type ForeignCase = [label: string, text: string];
  test.each<ForeignCase>([
    ["text that is not JSON", "{not json"],
    ["another version", JSON.stringify({ version: 2, players: { [PLAYER]: KEPT } })],
    ["players that are a list", JSON.stringify({ version: 1, players: [KEPT] })],
    ["no players", JSON.stringify({ version: 1 })],
    ["a list", "[]"],
    ["null", "null"],
  ])("reads %s as no history", async (_label, text) => {
    const { files } = fakeFiles({ [PATH]: text });

    expect(await createCostumeHistoryStore(PATH, files).load(PLAYER)).toEqual([]);
  });

  test("reads another player's history as none for this one", async () => {
    const { files } = fakeFiles({
      [PATH]: JSON.stringify({ version: 1, players: { [OTHER]: KEPT } }),
    });

    expect(await createCostumeHistoryStore(PATH, files).load(PLAYER)).toEqual([]);
  });

  test("does not read an inherited name as a player", async () => {
    const { files } = fakeFiles({ [PATH]: JSON.stringify({ version: 1, players: {} }) });

    expect(await createCostumeHistoryStore(PATH, files).load("constructor")).toEqual([]);
  });

  test("gives back the well-formed entries only, each set once and at most the cap", async () => {
    const crowd = Array.from({ length: MAX_COSTUME_HISTORY + 5 }, (_, at) => entryOf(at + 1));
    const kept = [{ set: SET, picture: "javascript:alert(1)" }, entryOf(1), entryOf(1), ...crowd];
    const { files } = fakeFiles({
      [PATH]: JSON.stringify({ version: 1, players: { [PLAYER]: kept } }),
    });

    const read = await createCostumeHistoryStore(PATH, files).load(PLAYER);

    expect(read).toEqual(crowd.slice(0, MAX_COSTUME_HISTORY));
  });

  test("rejects a rename that fails, and leaves the last file as it was", async () => {
    const { files, disk, refuse } = fakeFiles();
    const store = createCostumeHistoryStore(PATH, files);
    await store.save(PLAYER, KEPT);
    const last = disk.get(PATH);

    refuse.rename = true;

    await expect(store.save(PLAYER, [entryOf(9)])).rejects.toThrow("EPERM");
    expect(disk.get(PATH)).toBe(last);
    expect(await store.load(PLAYER)).toEqual(KEPT);
  });
});

describe("createCostumeHistoryStore on the disk", () => {
  const folders: string[] = [];
  afterEach(() => {
    for (const folder of folders.splice(0)) {
      rmSync(folder, { recursive: true, force: true });
    }
  });
  const storePath = () => {
    const folder = mkdtempSync(join(tmpdir(), "abth-history-"));
    folders.push(folder);
    return join(folder, "costume-history.json");
  };

  test("keeps a history across stores and leaves no temporary file", async () => {
    const path = storePath();
    await createCostumeHistoryStore(path).save(PLAYER, KEPT);

    expect(await createCostumeHistoryStore(path).load(PLAYER)).toEqual(KEPT);
    expect(existsSync(`${path}.tmp`)).toBe(false);
    expect(JSON.parse(readFileSync(path, "utf8")).version).toBe(1);
  });

  test("makes the folder it is kept in", async () => {
    const path = join(storePath(), "..", "later", "costume-history.json");

    await createCostumeHistoryStore(path).save(PLAYER, KEPT);

    expect(await createCostumeHistoryStore(path).load(PLAYER)).toEqual(KEPT);
  });

  test("rejects when the history cannot be written", async () => {
    const inTheWay = storePath();
    writeFileSync(inTheWay, "");

    await expect(
      createCostumeHistoryStore(join(inTheWay, "costume-history.json")).save(PLAYER, KEPT),
    ).rejects.toThrow();
  });
});
