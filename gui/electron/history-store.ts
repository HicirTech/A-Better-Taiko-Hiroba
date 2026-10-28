import * as nodeFs from "node:fs";

import {
  type CostumeHistoryStore,
  type FolderHistoryStore,
  type HistoryStore,
  readCostumeHistory,
  readFolderHistory,
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

/** The desktop's folder history, kept as the costume's is. */
export function createFolderHistoryStore(
  path: string,
  files: StoreFiles = nodeFs,
): FolderHistoryStore {
  return historyFile(path, readFolderHistory, files);
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
