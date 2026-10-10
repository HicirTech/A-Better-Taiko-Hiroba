import * as nodeFs from "node:fs";

import { readStoredScoreBook, type ScoresStore } from "../src/hiroba-session";
import { replaceFile } from "./replace-file";

interface StoredBooks {
  readonly version: 1;
  /** By taiko number. */
  readonly players: Record<string, unknown>;
}

/** The file operations the store makes: node's own, unless a test hands in its own. */
export type ScoresFiles = Pick<
  typeof nodeFs,
  "mkdirSync" | "readFileSync" | "renameSync" | "writeFileSync"
>;

/** The desktop's score books: one file, replaced whole at each save. */
export function createScoresStore(path: string, files: ScoresFiles = nodeFs): ScoresStore {
  const read = (): Record<string, unknown> => {
    try {
      const stored = JSON.parse(files.readFileSync(path, "utf8")) as {
        version?: unknown;
        players?: unknown;
      };
      return stored.version === 1 && isObject(stored.players) ? stored.players : {};
    } catch {
      return {};
    }
  };
  return {
    async load(taikoNo) {
      const players = read();
      return readStoredScoreBook(Object.hasOwn(players, taikoNo) ? players[taikoNo] : undefined);
    },
    async save(taikoNo, book) {
      const stored: StoredBooks = { version: 1, players: { ...read(), [taikoNo]: book } };
      replaceFile(path, JSON.stringify(stored), files);
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
