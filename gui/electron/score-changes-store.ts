import * as nodeFs from "node:fs";

import { readStoredScoreChanges, type ScoreChangesStore } from "../src/hiroba-session";
import { createPlayersFile } from "./players-file";
import type { StoreFiles } from "./replace-file";

/** The desktop's logs of what reads of scores changed: one file, replaced whole at each save. */
export function createScoreChangesStore(
  path: string,
  files: StoreFiles = nodeFs,
): ScoreChangesStore {
  const kept = createPlayersFile(path, (log) => readStoredScoreChanges(log) !== null, files);
  return {
    async load(taikoNo) {
      return readStoredScoreChanges(kept.load(taikoNo));
    },
    async save(taikoNo, log) {
      kept.save(taikoNo, log);
    },
  };
}
