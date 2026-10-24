import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { createPlayersFile } from "../electron/players-file";
import type { StoreFiles } from "../electron/replace-file";

const FOLDER = "C:/kept";
const PATH = `${FOLDER}/scores.json`;
const ASIDE = join(FOLDER, "scores.unreadable.json");
const PLAYER = "000000000000";
const OTHER = "111111111111";

const keptText = (players: Record<string, unknown>, version = 1) =>
  JSON.stringify({ version, players });

/** Files in memory, failing as node's do: a missing one with ENOENT, one held open with EBUSY. */
function fakeFiles(contents: Record<string, string> = {}) {
  const disk = new Map(Object.entries(contents));
  const held = new Set<string>();
  const files = {
    mkdirSync: () => undefined,
    readFileSync: (path: string) => {
      const text = disk.get(path);
      if (held.has(path)) {
        throw Object.assign(new Error(`EBUSY ${path}`), { code: "EBUSY" });
      }
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
  return { files, disk, held };
}

describe("createPlayersFile", () => {
  test("reads each player's data as this version kept it, and none for a player it lacks", () => {
    const { files } = fakeFiles({ [PATH]: keptText({ [PLAYER]: [1, 2] }) });
    const kept = createPlayersFile(PATH, Array.isArray, files);

    expect(kept.load(PLAYER)).toEqual([1, 2]);
    expect(kept.load(OTHER)).toBeUndefined();
  });

  test.each<[name: string, text: string]>([
    ["a cut-off file", `{"version":1,"players":{"${PLAYER}":[1],"${OTHER}":`],
    ["no JSON at all", "not a file of players"],
    ["no players", JSON.stringify({ version: 1 })],
    ["players in a list", JSON.stringify({ version: 1, players: [[1]] })],
    ["no version", JSON.stringify({ players: { [OTHER]: [1] } })],
  ])("keeps %s aside before writing over it, and reads none from it", (_name, text) => {
    const { files, disk } = fakeFiles({ [PATH]: text });
    const kept = createPlayersFile(PATH, Array.isArray, files);

    expect(kept.load(OTHER)).toBeUndefined();
    kept.save(PLAYER, [3]);

    expect(disk.get(ASIDE)).toBe(text);
    expect(disk.get(PATH)).toBe(keptText({ [PLAYER]: [3] }));
  });

  test("never writes over a file a later version kept", () => {
    const later = keptText({ [PLAYER]: { newer: true }, [OTHER]: { newer: true } }, 2);
    const { files, disk } = fakeFiles({ [PATH]: later });
    const kept = createPlayersFile(PATH, Array.isArray, files);

    kept.save(PLAYER, [3]);

    expect(disk.get(PATH)).toBe(later);
    expect(disk.has(ASIDE)).toBe(false);
    expect(kept.load(PLAYER)).toBeUndefined();
  });

  test("keeps the file aside when the player's own data does not read, and the others stay", () => {
    const text = keptText({ [PLAYER]: "not a list", [OTHER]: [1] });
    const { files, disk } = fakeFiles({ [PATH]: text });
    const kept = createPlayersFile(PATH, Array.isArray, files);

    expect(kept.load(PLAYER)).toBeUndefined();
    kept.save(PLAYER, [3]);

    expect(disk.get(ASIDE)).toBe(text);
    expect(disk.get(PATH)).toBe(keptText({ [PLAYER]: [3], [OTHER]: [1] }));
  });

  test("writes nothing over a file this run cannot open, and says why", () => {
    const text = keptText({ [OTHER]: [1] });
    const { files, disk, held } = fakeFiles({ [PATH]: text });
    held.add(PATH);
    const kept = createPlayersFile(PATH, Array.isArray, files);

    expect(kept.load(OTHER)).toBeUndefined();
    expect(() => kept.save(PLAYER, [3])).toThrow("EBUSY");
    expect(disk.get(PATH)).toBe(text);
    expect(disk.has(ASIDE)).toBe(false);
  });

  test("starts the file with its first save, and drops a player saved as none", () => {
    const { files, disk } = fakeFiles();
    const kept = createPlayersFile(PATH, Array.isArray, files);

    kept.save(PLAYER, [1]);
    kept.save(OTHER, [2]);
    kept.save(PLAYER, undefined);

    expect(disk.get(PATH)).toBe(keptText({ [OTHER]: [2] }));
    expect(disk.has(ASIDE)).toBe(false);
  });
});
