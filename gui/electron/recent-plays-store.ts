import * as nodeFs from "node:fs";

import { type RecentPlaysStore, readStoredRecentPlays } from "../src/hiroba-session";
import { createPlayersFile } from "./players-file";
import type { StoreFiles } from "./replace-file";

/** The desktop's recent plays: one file, replaced whole at each save. */
export function createRecentPlaysStore(path: string, files: StoreFiles = nodeFs): RecentPlaysStore {
  const kept = createPlayersFile(path, Array.isArray, files);
  return {
    async load(taikoNo) {
      return readStoredRecentPlays(kept.load(taikoNo));
    },
    async save(taikoNo, plays) {
      kept.save(taikoNo, plays.length === 0 ? undefined : plays);
    },
  };
}
