import * as nodeFs from "node:fs";

import { type CostumeHistoryStore, readCostumeHistory } from "../src/hiroba-session";
import { createPlayersFile } from "./players-file";
import type { StoreFiles } from "./replace-file";

/** The desktop's costume history: one file, replaced whole at each save. */
export function createCostumeHistoryStore(
  path: string,
  files: StoreFiles = nodeFs,
): CostumeHistoryStore {
  const kept = createPlayersFile(path, Array.isArray, files);
  return {
    async load(taikoNo) {
      return readCostumeHistory(kept.load(taikoNo));
    },
    async save(taikoNo, entries) {
      kept.save(taikoNo, entries.length === 0 ? undefined : entries);
    },
  };
}
