import { type FavoriteSongEditorReading, parseSongPickerPage } from "../hiroba-dom-parser";
import type { Genre, PickableSongs } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { describeAnswer } from "./ajax";
import { bsfOf, readFavoriteSongEditor } from "./favorite-song-write";
import { landingOf } from "./landing";
import { readHirobaPage } from "./read-page";
import type { HirobaReadFailure, ReadDeps } from "./types";

const EDITOR_PATH = "/portal_favorite_song_select.php";
const HANDOFF_PATH = "form_data.php";
const PICKER = "select_song.php";
const GENRES: readonly Genre[] = [1, 2, 3, 4, 5, 6, 7, 8];

/** Every song Hiroba's own 大好きな曲 picker offers, walked the way the editor's button walks it. */
export async function readSongPicker(
  deps: ReadDeps,
): Promise<Result<PickableSongs, HirobaReadFailure>> {
  const editor = await readFavoriteSongEditor(deps);
  if (isErr(editor)) {
    return editor;
  }
  const entered = await enterPicker(deps, editor.value);
  if (isErr(entered)) {
    return entered;
  }
  // A song can sit in several genres; it is offered once.
  const songs = new Set<string>();
  const ura = new Set<string>();
  for (const genre of GENRES) {
    const page = await readHirobaPage(deps, `${PICKER}?genre=${genre}`, (html) =>
      parseSongPickerPage(html, genre),
    );
    if (isErr(page)) {
      return page;
    }
    for (const row of page.value) {
      (row.ura ? ura : songs).add(row.songNo);
    }
  }
  return ok({ songs: [...songs], ura: [...ura] });
}

// The picker opens only through this handoff, which carries the editor's form as its button sends
// it. Where it lands is not checked: a picker it did not open answers each genre with the top page.
async function enterPicker(
  deps: ReadDeps,
  editor: FavoriteSongEditorReading,
): Promise<Result<null, HirobaReadFailure>> {
  const form = new URLSearchParams([
    ["from", EDITOR_PATH],
    ["list_type", "song"],
    ["_tckt", editor.token.reveal()],
    ["song_no", editor.state.songNo ?? ""],
    ["bsf", bsfOf(editor.state)],
  ]);
  const url = `${deps.hirobaOrigin}/${HANDOFF_PATH}?${form}`;
  const sent = await deps.transport.send({ method: "GET", url });
  if (isErr(sent)) {
    return err({ kind: sent.error.kind });
  }
  const response = sent.value;
  switch (landingOf(response.url, deps.hirobaOrigin)) {
    case "login":
      return err({ kind: "loggedOut" });
    case "cardSelect":
      return err({ kind: "cardSelectUnfinished" });
    case "elsewhere":
      return err({
        kind: "unexpectedPage",
        detail: `landing=elsewhere ${describeAnswer(response)}`,
      });
    case "hiroba":
      return response.status === 200
        ? ok(null)
        : err({ kind: "unexpectedPage", detail: describeAnswer(response) });
  }
}
