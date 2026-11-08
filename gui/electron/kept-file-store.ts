import * as nodeFs from "node:fs";
import { join } from "node:path";

import type { KeptStore, KeptThing } from "../src/hiroba-session";
import { createPlayersFile } from "./players-file";
import type { StoreFiles } from "./replace-file";

/** A kind of kept data in the desktop's data folder: one file, replaced whole at each save. */
export function keptFileStore<T, M>(
  folder: string,
  thing: KeptThing<T, M>,
  files: StoreFiles = nodeFs,
): KeptStore<T, M> {
  const readable = (data: unknown) => thing.read(data) !== null;
  const kept = createPlayersFile(join(folder, thing.file), readable, files);
  const earlier =
    thing.earlier === undefined
      ? null
      : createPlayersFile(join(folder, thing.earlier.file), readable, files);
  return {
    async load(taikoNo) {
      return thing.read(kept.load(taikoNo) ?? earlier?.load(taikoNo)) ?? thing.missing;
    },
    async save(taikoNo, value) {
      kept.save(taikoNo, thing.dropped(value) ? undefined : value);
    },
  };
}
