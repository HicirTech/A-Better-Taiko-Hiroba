import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  PICTURE_EPOCH,
  type PictureKey,
  type PictureStore,
  pictureKeyPath,
} from "../src/hiroba-session";

/** The desktop's pictures on disk under `folder`, one PNG per pictureKeyPath, kept across launches
 * and sign-outs; opening the store removes every other PICTURE_EPOCH's folder. Nothing throws. */
export function createDiskPictureStore(folder: string): PictureStore {
  const epochFolder = join(folder, PICTURE_EPOCH);
  dropOtherEpochs(folder);
  const fileOf = (key: PictureKey) => join(epochFolder, `${pictureKeyPath(key)}.png`);

  return {
    async get(key) {
      try {
        return new Uint8Array(readFileSync(fileOf(key)));
      } catch {
        return null;
      }
    },
    async put(key, bytes) {
      const file = fileOf(key);
      // Written beside its place and renamed into it, so a crash leaves no half picture.
      const temporary = `${file}.tmp`;
      try {
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(temporary, bytes, { flush: true });
        renameSync(temporary, file);
      } catch {
        // Not kept: the next launch fetches it again.
      }
    },
  };
}

function dropOtherEpochs(folder: string): void {
  try {
    for (const name of readdirSync(folder)) {
      if (name !== PICTURE_EPOCH) {
        rmSync(join(folder, name), { recursive: true, force: true });
      }
    }
  } catch {
    // No folder yet, or one the system holds open: what is left only takes room.
  }
}
