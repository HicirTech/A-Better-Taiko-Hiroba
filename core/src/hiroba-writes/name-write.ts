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

/** From `profileUpdate` (dialog.js): 1 refuses the name, in its own words; 2 is a failed update. */
const NAME_CODES = profileCodes([1, 2]);

const readEditor = (deps: ReadDeps) => readHirobaPage(deps, MY_PAGE_PATH, parseRenameEditorPage);

/** The rename: no pre-check (the site's script has none), one save; my page is the editor. */
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

export function changeName(
  input: { readonly expected: NameState; readonly target: NameState },
  deps: WriteDeps,
): Promise<WriteOutcome<NameState>> {
  return runWrite(RENAME_WRITE, input, deps);
}
