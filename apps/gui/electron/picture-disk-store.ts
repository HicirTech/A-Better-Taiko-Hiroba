import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  PICTURE_EPOCH,
  type PictureKey,
  type PictureStore,
  pictureKeyPath,
} from "../src/hiroba-session";

/**
 * The desktop's pictures on disk, in `folder` (the app's profile folder's `pictures`), kept across
 * launches and sign-outs for good: each is fetched from Hiroba once. Each is one PNG file,
 * `<epoch>/shared/<hash>.png` or `<epoch>/player/<hash>/<hash>.png`, named by pictureKeyPath: the
 * checked bytes and nothing else, no URL, header, cookie or taiko number.
 *
 * Nothing here deletes a picture but a PICTURE_EPOCH bump: opening the store removes every other
 * epoch's folder. What it holds is bounded by what Hiroba has to show, a thumbnail per item and a
 * plate per title, each within its kind's byte limit.
 *
 * A file is written beside its place and renamed into it, so a crash leaves no half picture to
 * be shown for good. A file that cannot be read is a miss, and a picture that cannot be written is
 * not kept: either way it is fetched again, and nothing throws.
 */
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

/** Removes what an earlier PICTURE_EPOCH kept in `folder`: none of it is asked for again. */
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
