import * as nodeFs from "node:fs";

import {
  NO_RATING_HISTORY,
  type RatingHistoryStore,
  readStoredRatingHistory,
} from "../src/hiroba-session";
import { createPlayersFile } from "./players-file";
import type { StoreFiles } from "./replace-file";

/** The desktop's kept ratings: one file, replaced whole at each save. */
export function createRatingHistoryStore(
  path: string,
  files: StoreFiles = nodeFs,
): RatingHistoryStore {
  const kept = createPlayersFile(
    path,
    (history) => readStoredRatingHistory(history) !== null,
    files,
  );
  return {
    async load(taikoNo) {
      return readStoredRatingHistory(kept.load(taikoNo)) ?? NO_RATING_HISTORY;
    },
    async save(taikoNo, history) {
      kept.save(taikoNo, history);
    },
  };
}
