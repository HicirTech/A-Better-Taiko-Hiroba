import * as nodeFs from "node:fs";

import { readStoredScoreChanges, type ScoreChangesStore } from "../src/hiroba-session";
import { createPlayersFile } from "./players-file";
import type { StoreFiles } from "./replace-file";

const readable = (log: unknown) => readStoredScoreChanges(log) !== null;

/** The desktop's logs of what reads of scores changed: one file, replaced whole at each save. */
export function createScoreChangesStore(
  path: string,
  /** Where builds that logged no hits keep theirs: read until a save, and left as it is. */
  earlierPath: string,
  files: StoreFiles = nodeFs,
): ScoreChangesStore {
  const kept = createPlayersFile(path, readable, files);
  const earlier = createPlayersFile(earlierPath, readable, files);
  return {
    async load(taikoNo) {
      return readStoredScoreChanges(kept.load(taikoNo) ?? earlier.load(taikoNo));
    },
    async save(taikoNo, log) {
      kept.save(taikoNo, log);
    },
  };
}
