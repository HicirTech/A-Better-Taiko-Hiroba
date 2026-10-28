import * as nodeFs from "node:fs";

import {
  type CostumeHistoryStore,
  type HistoryStore,
  readCostumeHistory,
} from "../src/hiroba-session";
import { createPlayersFile } from "./players-file";
import type { StoreFiles } from "./replace-file";

/** The desktop's costume history: one file, replaced whole at each save. */
export function createCostumeHistoryStore(
  path: string,
  files: StoreFiles = nodeFs,
): CostumeHistoryStore {
  return historyFile(path, readCostumeHistory, files);
}

function historyFile<Entry>(
  path: string,
  read: (stored: unknown) => Entry[],
  files: StoreFiles,
): HistoryStore<Entry> {
  const kept = createPlayersFile(path, Array.isArray, files);
  return {
    async load(taikoNo) {
      return read(kept.load(taikoNo));
    },
    async save(taikoNo, entries) {
      kept.save(taikoNo, entries.length === 0 ? undefined : entries);
    },
  };
}
