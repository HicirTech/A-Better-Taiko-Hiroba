import * as nodeFs from "node:fs";

import { readStoredScoreChanges, type ScoreChangesStore } from "../src/hiroba-session";
import { replaceFile } from "./replace-file";
import type { ScoresFiles } from "./scores-store";

interface StoredLogs {
  readonly version: 1;
  /** By taiko number. */
  readonly players: Record<string, unknown>;
}

/** The desktop's logs of what reads of scores changed: one file, replaced whole at each save. */
export function createScoreChangesStore(
  path: string,
  files: ScoresFiles = nodeFs,
): ScoreChangesStore {
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
      return readStoredScoreChanges(Object.hasOwn(players, taikoNo) ? players[taikoNo] : undefined);
    },
    async save(taikoNo, log) {
      const stored: StoredLogs = { version: 1, players: { ...read(), [taikoNo]: log } };
      replaceFile(path, JSON.stringify(stored), files);
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
