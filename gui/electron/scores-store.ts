import * as nodeFs from "node:fs";

import { isStoredScoreBook, readStoredScoreBook, type ScoresStore } from "../src/hiroba-session";
import { createPlayersFile } from "./players-file";
import type { StoreFiles } from "./replace-file";

/** The desktop's score books: one file, replaced whole at each save. */
export function createScoresStore(path: string, files: StoreFiles = nodeFs): ScoresStore {
  const kept = createPlayersFile(path, isStoredScoreBook, files);
  return {
    async load(taikoNo) {
      return readStoredScoreBook(kept.load(taikoNo));
    },
    async save(taikoNo, book) {
      kept.save(taikoNo, book);
    },
  };
}
