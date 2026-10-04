import { err, type Result } from "@abth/core";

import type { SongCatalogueRead } from "./types";

/** taiko.wiki's song list, as `/api/v1/song/all` answers it, cut to the app's own shape. */
export function parseWikiSongs(
  _text: string,
): Result<Omit<SongCatalogueRead, "sentAt">, { readonly code: "badAnswer" }> {
  return err({ code: "badAnswer" });
}
