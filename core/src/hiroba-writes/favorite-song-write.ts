import type { FavoriteSongState, ShownSong } from "../hiroba-models";
import { err, type Result } from "../operation-results";
import type { HirobaReadFailure, ReadDeps, WriteDeps, WriteOutcome } from "./types";

/** The 大好きな曲's editor as the interface shows it. */
export interface FavoriteSongEditorView {
  readonly state: FavoriteSongState;
  /** The song set, as Hiroba shows it; null when none is. */
  readonly song: ShownSong | null;
}

export async function openFavoriteSongEditor(
  _deps: ReadDeps,
): Promise<Result<FavoriteSongEditorView, HirobaReadFailure>> {
  return err({ kind: "unexpectedPage", detail: "favoriteSong=unwritten" });
}

export async function changeFavoriteSong(
  _input: { readonly expected: FavoriteSongState; readonly target: FavoriteSongState },
  _deps: WriteDeps,
): Promise<WriteOutcome<FavoriteSongState>> {
  return {
    kind: "readFailed",
    failure: { kind: "unexpectedPage", detail: "favoriteSong=unwritten" },
  };
}
