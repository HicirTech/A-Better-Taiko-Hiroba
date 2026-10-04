import {
  type CostumeEditorReading,
  type CostumeSwatch,
  parseCostumeEditorPage,
} from "../hiroba-dom-parser";
import type { CostumeSet } from "../hiroba-models";
import { isErr, ok, type Result } from "../operation-results";
import { checkCostumeTarget, costumeAfter, sameCostume } from "./costume-rule";
import { TITLE_STAYS } from "./cross-checks";
import { readHirobaPage } from "./read-page";
import { runWrite } from "./run-write";
import type {
  AjaxPost,
  CrossCheck,
  HirobaReadFailure,
  NotAppliedReason,
  ReadDeps,
  SaveCodes,
  SaveReading,
  WriteDeps,
  WriteOutcome,
  WriteSpec,
} from "./types";

/** Fetched bare: never with `?fav=` (the きせかえタンス applies a preset) or `?costume=`. */
const EDITOR_PATH = "mypage_kisekae.php";
const PRECHECK_PATH = "ajax/check_ip_kisekae.php";
const SAVE_PATH = "ajax/change_mydon.php";

/** The costume editor as the interface shows it: the set and the page's own lists, no token. */
export interface CostumeEditorView {
  readonly state: CostumeSet;
  readonly palette: readonly CostumeSwatch[];
  readonly slots: readonly (readonly number[])[];
}

/** `#kisekae` serialised as the site's script sends it: the token, then the eight values. */
function costumeForm(editor: CostumeEditorReading, body: CostumeSet): AjaxPost["form"] {
  return [
    ["_tckt", editor.token],
    ["color_body", String(body.colorBody)],
    ["color_limb", String(body.colorLimb)],
    ["color_face", String(body.colorFace)],
    ["costume_1", String(body.costume1)],
    ["costume_2", String(body.costume2)],
    ["costume_3", String(body.costume3)],
    ["costume_4", String(body.costume4)],
    ["costume_5", String(body.costume5)],
  ];
}

/** From `changeMydon` in mydon.js: 0 succeeds, 1 to 999 shows `errmsg`, anything else fails. */
const COSTUME_CODES: SaveCodes = {
  reason(save: SaveReading): NotAppliedReason {
    if (save.answer !== "json") {
      return { kind: save.answer };
    }
    if (save.code === 0) {
      return { kind: "unchanged" };
    }
    return save.code !== null && save.code >= 1 && save.code <= 999
      ? { kind: "refused", code: save.code, message: save.message }
      : { kind: "failed", code: save.code };
  },
};

const readEditor = (deps: ReadDeps) => readHirobaPage(deps, EDITOR_PATH, parseCostumeEditorPage);

const readSet = async (deps: ReadDeps): Promise<Result<CostumeSet, HirobaReadFailure>> => {
  const read = await readEditor(deps);
  return isErr(read) ? read : ok(read.value.state);
};

/** A title that cannot combine with a costume item removes it, so title writes check the set. */
export const COSTUME_STAYS: CrossCheck<CostumeSet> = { read: readSet, same: sameCostume };

export const COSTUME_WRITE: WriteSpec<
  CostumeSet,
  CostumeSet,
  CostumeSet,
  CostumeEditorReading,
  string
> = {
  readEditor,
  same: sameCostume,
  normalise: checkCostumeTarget,
  expectedAfter: (_before, body) => costumeAfter(body),
  precheck: (editor, body) => ({
    path: PRECHECK_PATH,
    referer: EDITOR_PATH,
    form: costumeForm(editor, body),
  }),
  save: (editor, body) => ({
    path: SAVE_PATH,
    referer: EDITOR_PATH,
    form: costumeForm(editor, body),
  }),
  codes: COSTUME_CODES,
  readBack: readSet,
  cross: TITLE_STAYS,
};

export async function openCostumeEditor(
  deps: ReadDeps,
): Promise<Result<CostumeEditorView, HirobaReadFailure>> {
  const read = await readEditor(deps);
  if (isErr(read)) {
    return read;
  }
  const { state, palette, slots } = read.value;
  return ok({ state, palette, slots });
}

export function changeCostume(
  input: { readonly expected: CostumeSet; readonly target: CostumeSet },
  deps: WriteDeps,
): Promise<WriteOutcome<CostumeSet>> {
  return runWrite(COSTUME_WRITE, input, deps);
}
