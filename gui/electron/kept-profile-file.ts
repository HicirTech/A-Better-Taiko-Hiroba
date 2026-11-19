import { readFileSync, rmSync } from "node:fs";
import { isRecord } from "@abth/core";

import { KEPT_PROFILE_VERSION, type KeptProfileStore, keptProfileIn } from "../src/hiroba-session";
import { replaceFile } from "./replace-file";

/** The last good read of my page, as one file in the data folder until the session ends. */
export function keptProfileFile(path: string): KeptProfileStore {
  return {
    async load() {
      try {
        const kept: unknown = JSON.parse(readFileSync(path, "utf8"));
        return isRecord(kept) && kept.v === KEPT_PROFILE_VERSION ? keptProfileIn(kept) : null;
      } catch {
        return null;
      }
    },
    async save(kept) {
      try {
        if (kept === null) {
          rmSync(path, { force: true });
        } else {
          replaceFile(path, JSON.stringify({ v: KEPT_PROFILE_VERSION, ...kept }));
        }
      } catch {
        // A file held elsewhere: the next good read writes it, the next session's end deletes it.
      }
    },
  };
}
