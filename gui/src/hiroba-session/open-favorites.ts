import {
  isErr,
  ok,
  openFavoriteSongEditor,
  openFolderEditor,
  type Result,
  type Transport,
} from "@abth/core";

import type { FavoritesView, ReadFailure } from "../session-port";
import type { HirobaEndpoints } from "./types";

/** Reads the folder's editor, then the 大好きな曲's, for the interface; the form tokens stay in the
 * core. */
export async function openFavorites(
  transport: Transport,
  endpoints: HirobaEndpoints,
): Promise<Result<FavoritesView, ReadFailure>> {
  const deps = { transport, hirobaOrigin: endpoints.hirobaOrigin };
  const folder = await openFolderEditor(deps);
  if (isErr(folder)) {
    return folder;
  }
  const song = await openFavoriteSongEditor(deps);
  return isErr(song) ? song : ok({ folder: folder.value, song: song.value });
}
