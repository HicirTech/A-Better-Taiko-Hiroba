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

/** The title page as the interface shows it: the worn title and the owned titles, no token. */
export interface TitleEditorView {
  readonly state: TitleState;
  readonly options: readonly TitleOption[];
}

/** From `titleComp` (title.js): 1 no title chosen, 5 not owned, 6 error; they carry no message. */
const TITLE_CODES = profileCodes([1, 5, 6]);

const readEditor = (deps: ReadDeps) => readHirobaPage(deps, EDITOR_PATH, parseTitleEditorPage);

/** Both posts are the page's own, as `titleComp` sends them; the read-back is my page. */
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

export function changeTitle(
  input: { readonly expected: TitleState; readonly target: TitleTarget },
  deps: WriteDeps<TitleState>,
): Promise<WriteOutcome<TitleState>> {
  return runWrite(TITLE_WRITE, input, deps);
}
