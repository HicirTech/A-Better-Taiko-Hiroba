import type { FolderState, ShownSong } from "../hiroba-models";
import { err, type Result } from "../operation-results";
import type { HirobaReadFailure, ReadDeps, WriteDeps, WriteOutcome } from "./types";

/** The folder's editor as the interface shows it: the slots, and the songs in them. */
export interface FolderEditorView {
  readonly state: FolderState;
  /** The filled slots' songs as Hiroba shows them, in slot order. */
  readonly songs: readonly ShownSong[];
}

export async function openFolderEditor(
  _deps: ReadDeps,
): Promise<Result<FolderEditorView, HirobaReadFailure>> {
  return err({ kind: "unexpectedPage", detail: "folder=unwritten" });
}

/** `target` fills the first slots in order and empties the rest. */
export async function changeFolder(
  _input: { readonly expected: FolderState; readonly target: readonly string[] },
  _deps: WriteDeps,
): Promise<WriteOutcome<FolderState>> {
  return { kind: "readFailed", failure: { kind: "unexpectedPage", detail: "folder=unwritten" } };
}
