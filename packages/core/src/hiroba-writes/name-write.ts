import { parseRenameEditorPage, type RenameEditorReading } from "../hiroba-dom-parser";
import type { NameState } from "../hiroba-models";
import { isErr, ok } from "../operation-results";
import { TITLE_STAYS } from "./cross-checks";
import { MY_PAGE_PATH } from "./my-page";
import { checkNameTarget, type NameBody, sameName } from "./name-rule";
import { profileCodes } from "./profile-codes";
import { readHirobaPage } from "./read-page";
import { runWrite } from "./run-write";
import type { ReadDeps, WriteDeps, WriteOutcome, WriteSpec } from "./types";

const SAVE_PATH = "ajax/change_mydon_profile.php";

/**
 * The save's codes, from `profileUpdate` in dialog.js: 1 is the site's refusal of the name, with
 * its own words in `err_message`, and 2 a failed update. The words are Hiroba's and shown as text:
 * the site writes them as HTML, and this app never does.
 */
const NAME_CODES = profileCodes([1, 2]);

const readEditor = (deps: ReadDeps) => readHirobaPage(deps, MY_PAGE_PATH, parseRenameEditorPage);

/**
 * The rename: no pre-check, as the site's script has none, and one save whose body is the dialog's
 * form serialised (`_tckt`, `mode`, `oldName`, `newName`). My page is the editor, the page that
 * shows the name saved, and the page the title's cross-check reads: a rename reads it for the
 * editor and for the read-back, and twice more with the cross-check on, the first of them before
 * the editor so that the editor's token is the last one issued before the post.
 */
export const RENAME_WRITE: WriteSpec<NameState, NameState, NameBody, RenameEditorReading, string> =
  {
    readEditor,
    same: sameName,
    normalise: checkNameTarget,
    expectedAfter: (_before, body) => ({ nickname: body.newName }),
    save: (editor, body) => ({
      path: SAVE_PATH,
      referer: MY_PAGE_PATH,
      form: [
        ["_tckt", editor.token],
        ["mode", "name"],
        ["oldName", body.oldName],
        ["newName", body.newName],
      ],
    }),
    codes: NAME_CODES,
    readBack: async (deps) => {
      const read = await readEditor(deps);
      return isErr(read) ? read : ok(read.value.state);
    },
    cross: TITLE_STAYS,
  };

/**
 * Changes the Donder name from `expected` to `target`, the one way every write goes (`runWrite`):
 * at most one GET of my page for the editor, one save, and one GET to read the name back — two more
 * GETs of my page, for the title, with the cross-check on.
 */
export function changeName(
  input: { readonly expected: NameState; readonly target: NameState },
  deps: WriteDeps<NameState>,
): Promise<WriteOutcome<NameState>> {
  return runWrite(RENAME_WRITE, input, deps);
}
