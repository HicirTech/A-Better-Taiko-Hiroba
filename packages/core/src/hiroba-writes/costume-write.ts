import {
  type CostumeEditorReading,
  type CostumeSwatch,
  parseCostumeEditorPage,
  parseProfilePage,
} from "../hiroba-dom-parser";
import type { CostumeSet } from "../hiroba-models";
import { isErr, ok, type Result } from "../operation-results";
import { checkCostumeTarget, costumeAfter, sameCostume } from "./costume-rule";
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

/** The editor, fetched bare: never with `?fav=` (the きせかえタンス applies a preset) or `?costume=`. */
const EDITOR_PATH = "mypage_kisekae.php";
const PRECHECK_PATH = "ajax/check_ip_kisekae.php";
const SAVE_PATH = "ajax/change_mydon.php";
const MY_PAGE_PATH = "mypage_top.php";

/** The costume editor as the interface shows it: the set and the page's own lists, no token. */
export interface CostumeEditorView {
  readonly state: CostumeSet;
  readonly palette: readonly CostumeSwatch[];
  /** The items owned in each slot, five lists, きぐるみ first. */
  readonly slots: readonly (readonly number[])[];
}

/**
 * The body both posts carry: `#kisekae` serialised, as the site's script sends it — the token,
 * then the eight values in the form's order.
 */
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

/**
 * The save's codes, copied from `changeMydon` in mydon.js, which has three branches and no more:
 * 0 is success; 1 to 999 shows `errmsg`; anything else is 更新に失敗しました. There is no 3, 705 or
 * 900 of its own here, so none is read into one.
 */
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

/**
 * The title on my page, read before and after a costume write while costume writes are not yet
 * verified: the pre-check exists to warn that a title or item that cannot be combined will come
 * off, and if it ever misjudged, the title is what would move.
 */
const TITLE_STAYS: CrossCheck<string> = {
  read: (deps) =>
    readHirobaPage(deps, MY_PAGE_PATH, (html) => {
      const page = parseProfilePage(html, "");
      return isErr(page) ? page : ok(page.value.title);
    }),
  same: (left, right) => spaced(left) === spaced(right),
};

const readEditor = (deps: ReadDeps) => readHirobaPage(deps, EDITOR_PATH, parseCostumeEditorPage);

/** The costume write: pre-check `check_ip_kisekae`, save `change_mydon`, read the editor back. */
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
  readBack: async (deps) => {
    const read = await readEditor(deps);
    return isErr(read) ? read : ok(read.value.state);
  },
  cross: TITLE_STAYS,
};

/** Reads the costume editor, once, for the interface: the token is left behind. */
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

/**
 * Changes the costume from `expected` to `target`, the one way every write goes (`runWrite`): at
 * most one GET of the editor, the pre-check, one save and one GET to read the set back — two more
 * GETs of my page with the cross-check on.
 */
export function changeCostume(
  input: { readonly expected: CostumeSet; readonly target: CostumeSet },
  deps: WriteDeps<CostumeSet>,
): Promise<WriteOutcome<CostumeSet>> {
  return runWrite(COSTUME_WRITE, input, deps);
}

/** Whitespace as one space and none at the ends, non-breaking spaces included. */
function spaced(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
