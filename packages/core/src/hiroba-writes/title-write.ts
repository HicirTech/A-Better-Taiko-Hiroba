import { parseTitleEditorPage, type TitleEditorReading } from "../hiroba-dom-parser";
import type { CostumeSet, TitleOption, TitleState } from "../hiroba-models";
import { isErr, ok, type Result } from "../operation-results";
import { COSTUME_STAYS } from "./costume-write";
import { readMyPage } from "./my-page";
import { profileCodes } from "./profile-codes";
import { readHirobaPage } from "./read-page";
import { runWrite } from "./run-write";
import { checkTitleTarget, sameTitle, type TitleBody, type TitleTarget } from "./title-rule";
import type { HirobaReadFailure, ReadDeps, WriteDeps, WriteOutcome, WriteSpec } from "./types";

/** The title page, fetched bare: it takes no query. */
const EDITOR_PATH = "mypage_title_edit.php";
const PRECHECK_PATH = "ajax/check_ip_title.php";
const SAVE_PATH = "ajax/change_mydon_profile.php";

/**
 * The title page as the interface shows it: the title worn now, and the titles the account owns.
 * No token.
 */
export interface TitleEditorView {
  readonly state: TitleState;
  readonly options: readonly TitleOption[];
}

/**
 * The save's codes, from `titleComp` in title.js: 1 is no title chosen, 5 a title the account does
 * not own, 6 an error asking to choose again. The answer's message is empty at these codes, so the
 * interface words them.
 */
const TITLE_CODES = profileCodes([1, 5, 6]);

const readEditor = (deps: ReadDeps) => readHirobaPage(deps, EDITOR_PATH, parseTitleEditorPage);

/**
 * The title write: pre-check `check_ip_title`, save `change_mydon_profile`, and my page read back
 * for the title, as the page that shows what is saved. Both posts are the page's own, as
 * `titleComp` sends them: the pre-check carries no token, and the save its fields in the order of
 * the script's data object, with `getStatus` the page's hidden input holds.
 */
export const TITLE_WRITE: WriteSpec<
  TitleState,
  TitleTarget,
  TitleBody,
  TitleEditorReading,
  CostumeSet
> = {
  readEditor,
  same: sameTitle,
  normalise: checkTitleTarget,
  expectedAfter: (_before, body) => ({ title: body.label }),
  precheck: (_editor, body) => ({
    path: PRECHECK_PATH,
    referer: EDITOR_PATH,
    form: [
      ["mode", "title"],
      ["newTitle", String(body.id)],
    ],
  }),
  save: (editor, body) => ({
    path: SAVE_PATH,
    referer: EDITOR_PATH,
    form: [
      ["newTitle", String(body.id)],
      ["_tckt", editor.token],
      ["mode", "title"],
      ["getStatus", "1"],
    ],
  }),
  codes: TITLE_CODES,
  readBack: async (deps) => {
    const page = await readMyPage(deps);
    return isErr(page) ? page : ok({ title: page.value.title });
  },
  cross: COSTUME_STAYS,
};

/** Reads the title page, once, for the interface: the token is left behind. */
export async function openTitleEditor(
  deps: ReadDeps,
): Promise<Result<TitleEditorView, HirobaReadFailure>> {
  const read = await readEditor(deps);
  if (isErr(read)) {
    return read;
  }
  const { state, options } = read.value;
  return ok({ state, options });
}

/**
 * Changes the title from `expected` to `target`, the one way every write goes (`runWrite`): at
 * most one GET of the title page, the pre-check, one save and one GET of my page to read the title
 * back — two more GETs of the costume page with the cross-check on.
 */
export function changeTitle(
  input: { readonly expected: TitleState; readonly target: TitleTarget },
  deps: WriteDeps<TitleState>,
): Promise<WriteOutcome<TitleState>> {
  return runWrite(TITLE_WRITE, input, deps);
}
