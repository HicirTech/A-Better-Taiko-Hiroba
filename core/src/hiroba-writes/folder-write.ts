import { type FolderEditorReading, parseFolderEditorPage } from "../hiroba-dom-parser";
import { FOLDER_SLOT_COUNT, type FolderState, isSongNo, type ShownSong } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { readHirobaPage } from "./read-page";
import { runWrite } from "./run-write";
import type {
  HirobaReadFailure,
  InvalidTarget,
  NotAppliedReason,
  ReadDeps,
  SaveCodes,
  SaveReading,
  WriteDeps,
  WriteOutcome,
  WriteSpec,
} from "./types";

const PAGE = "favorite_song_select.php";
const EDITOR_PATH = `${PAGE}?init=1`;
const SAVE_PATH = "ajax/myfavorite_song.php";
const FOLDER_FIELD = "folder";

/** The folder's editor as the interface shows it: the slots, and the songs in them. */
export interface FolderEditorView {
  readonly state: FolderState;
  /** The filled slots' songs as Hiroba shows them, in slot order. */
  readonly songs: readonly ShownSong[];
}

/** The thirty slots to write, the target in order and then empty ones. */
type FolderBody = FolderState["slots"];

/** From `myfavoriteComp` (mydon.js): 0 succeeds and any other code shows the site's `errmsg`. */
const FOLDER_CODES: SaveCodes = {
  reason(save: SaveReading): NotAppliedReason {
    if (save.answer !== "json") {
      return { kind: save.answer };
    }
    if (save.code === 0) {
      return { kind: "unchanged" };
    }
    return save.code === null
      ? { kind: "failed", code: null }
      : { kind: "refused", code: save.code, message: save.message };
  },
};

const readEditor = (deps: ReadDeps) => readHirobaPage(deps, EDITOR_PATH, parseFolderEditorPage);

function sameFolder(left: FolderState, right: FolderState): boolean {
  return (
    left.slots.length === right.slots.length &&
    left.slots.every((slot, index) => slot === right.slots[index])
  );
}

function checkFolderTarget(target: readonly string[]): Result<FolderBody, InvalidTarget> {
  const valid =
    target.length <= FOLDER_SLOT_COUNT &&
    target.every(isSongNo) &&
    new Set(target).size === target.length;
  return valid
    ? ok(Array.from({ length: FOLDER_SLOT_COUNT }, (_, index) => target[index] ?? null))
    : err({ field: FOLDER_FIELD });
}

const stagingPath = (slot: number, songNo: string | null) =>
  `${PAGE}?song_no_${slot}=${encodeURIComponent(songNo ?? "")}&session_flg=1`;

/** One GET per slot that `from` shows other than the body; the last page read is the result. */
async function stageDifferences(
  deps: ReadDeps,
  from: FolderEditorReading,
  body: FolderBody,
): Promise<Result<FolderEditorReading, HirobaReadFailure>> {
  let last = from;
  for (const [index, songNo] of body.entries()) {
    if (from.state.slots[index] === songNo) {
      continue;
    }
    const read = await readHirobaPage(deps, stagingPath(index + 1, songNo), parseFolderEditorPage);
    if (isErr(read)) {
      return read;
    }
    last = read.value;
  }
  return ok(last);
}

async function stageFolder(
  deps: ReadDeps,
  editor: FolderEditorReading,
  body: FolderBody,
): Promise<Result<FolderEditorReading, HirobaReadFailure>> {
  const first = await stageDifferences(deps, editor, body);
  if (isErr(first) || sameFolder(first.value.state, { slots: body })) {
    return first;
  }
  // Nobody has checked that `init=1` stages the saved folder; if it does not, this pass fills
  // the slots the first one left alone.
  return stageDifferences(deps, first.value, body);
}

export const FOLDER_WRITE: WriteSpec<
  FolderState,
  readonly string[],
  FolderBody,
  FolderEditorReading,
  never
> = {
  readEditor,
  same: sameFolder,
  normalise: (_editor, target) => checkFolderTarget(target),
  expectedAfter: (_before, body) => ({ slots: body }),
  stage: stageFolder,
  save: (editor, body) => ({
    path: SAVE_PATH,
    referer: PAGE,
    form: [
      ...body.map((songNo, index) => [`song_no_${index + 1}`, songNo ?? ""] as const),
      ["_tckt", editor.token],
    ],
  }),
  codes: FOLDER_CODES,
  readBack: async (deps) => {
    const read = await readEditor(deps);
    return isErr(read) ? read : ok(read.value.state);
  },
};

export async function openFolderEditor(
  deps: ReadDeps,
): Promise<Result<FolderEditorView, HirobaReadFailure>> {
  const read = await readEditor(deps);
  if (isErr(read)) {
    return read;
  }
  const { state, songs } = read.value;
  return ok({ state, songs });
}

/** `target` fills the first slots in order and empties the rest. */
export function changeFolder(
  input: { readonly expected: FolderState; readonly target: readonly string[] },
  deps: WriteDeps,
): Promise<WriteOutcome<FolderState>> {
  return runWrite(FOLDER_WRITE, input, deps);
}
