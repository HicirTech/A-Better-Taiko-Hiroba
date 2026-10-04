import * as nodeFs from "node:fs";
import { dirname } from "node:path";

import { type CostumeHistoryStore, readCostumeHistory } from "../src/hiroba-session";

interface StoredHistory {
  readonly version: 1;
  /** By taiko number. */
  readonly players: Record<string, unknown>;
}

/** The file operations the store makes: node's own, unless a test hands in its own. */
export type HistoryFiles = Pick<
  typeof nodeFs,
  "mkdirSync" | "readFileSync" | "renameSync" | "writeFileSync"
>;

/** The desktop's costume history: one file, saved via a flushed temporary one renamed over the
 * last, so a crash leaves the old file or the new one. */
export function createCostumeHistoryStore(
  path: string,
  files: HistoryFiles = nodeFs,
): CostumeHistoryStore {
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
      return readCostumeHistory(Object.hasOwn(players, taikoNo) ? players[taikoNo] : undefined);
    },
    async save(taikoNo, entries) {
      const players = { ...read() };
      if (entries.length === 0) {
        delete players[taikoNo];
      } else {
        players[taikoNo] = entries;
      }
      const stored: StoredHistory = { version: 1, players };
      const temporary = `${path}.tmp`;
      files.mkdirSync(dirname(path), { recursive: true });
      files.writeFileSync(temporary, JSON.stringify(stored), { flush: true });
      files.renameSync(temporary, path);
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
