import { type FavoriteSongEditorReading, parseFavoriteSongEditorPage } from "../hiroba-dom-parser";
import { type FavoriteSongState, isSongNo, type ShownSong } from "../hiroba-models";
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

const PAGE = "portal_favorite_song_select.php";
const SAVE_PATH = "ajax/mypage_song.php";
const FAVORITE_SONG_FIELD = "favoriteSong";

/** The 大好きな曲's editor as the interface shows it. */
export interface FavoriteSongEditorView {
  readonly state: FavoriteSongState;
  /** The song set, as Hiroba shows it; null when none is. */
  readonly song: ShownSong | null;
}

/** From `favoriteSongComp` (mydon.js): 1 not unlocked and 2 not published carry no message. */
const FAVORITE_SONG_CODES: SaveCodes = {
  reason(save: SaveReading): NotAppliedReason {
    if (save.answer !== "json") {
      return { kind: save.answer };
    }
    switch (save.code) {
      case 0:
        return { kind: "unchanged" };
      case 1:
      case 2:
        return { kind: "refused", code: save.code, message: null };
      case 705:
        return { kind: "stale" };
      case 901:
        return { kind: "siteMaintenance" };
      default:
        return { kind: "failed", code: save.code };
    }
  },
};

/** `bsf` as the picker's links carry it: 1 for a 裏 entry, 0 for a song, empty with no song. */
export function bsfOf(state: FavoriteSongState): string {
  if (state.songNo === null) {
    return "";
  }
  return state.ura ? "1" : "0";
}

/** The same song, and the same entry of it: the song itself or its 裏 entry. */
export function sameFavoriteSong(left: FavoriteSongState, right: FavoriteSongState): boolean {
  return left.songNo === right.songNo && left.ura === right.ura;
}

export const readFavoriteSongEditor = (deps: ReadDeps) =>
  readHirobaPage(deps, PAGE, parseFavoriteSongEditorPage);

function checkFavoriteSongTarget(
  target: FavoriteSongState,
): Result<FavoriteSongState, InvalidTarget> {
  const valid = target.songNo === null ? !target.ura : isSongNo(target.songNo);
  return valid
    ? ok({ songNo: target.songNo, ura: target.ura })
    : err({ field: FAVORITE_SONG_FIELD });
}

export const FAVORITE_SONG_WRITE: WriteSpec<
  FavoriteSongState,
  FavoriteSongState,
  FavoriteSongState,
  FavoriteSongEditorReading,
  never
> = {
  readEditor: readFavoriteSongEditor,
  same: sameFavoriteSong,
  normalise: (_editor, target) => checkFavoriteSongTarget(target),
  expectedAfter: (_before, body) => body,
  save: (editor, body) => ({
    path: SAVE_PATH,
    referer: PAGE,
    form: [
      ["song_no", body.songNo ?? ""],
      ["bsf", bsfOf(body)],
      ["_tckt", editor.token],
    ],
  }),
  codes: FAVORITE_SONG_CODES,
  readBack: async (deps) => {
    const read = await readFavoriteSongEditor(deps);
    return isErr(read) ? read : ok(read.value.state);
  },
};

export async function openFavoriteSongEditor(
  deps: ReadDeps,
): Promise<Result<FavoriteSongEditorView, HirobaReadFailure>> {
  const read = await readFavoriteSongEditor(deps);
  if (isErr(read)) {
    return read;
  }
  const { state, song } = read.value;
  return ok({ state, song });
}

export function changeFavoriteSong(
  input: { readonly expected: FavoriteSongState; readonly target: FavoriteSongState },
  deps: WriteDeps,
): Promise<WriteOutcome<FavoriteSongState>> {
  return runWrite(FAVORITE_SONG_WRITE, input, deps);
}
