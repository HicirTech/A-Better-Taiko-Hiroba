import type { HTMLElement } from "node-html-parser";

import { FormToken, type RenameState } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { readIdentity } from "./identity-reader";
import { parsePage, requireMarker } from "./parser";
import type { ParseFailure, RenameEditorReading } from "./types";

const PAGE = "mypage_top.php";
/** The form that writes a name, in the dialog my page carries, and where it posts. */
const FORM = "form#renameForm";
const FORM_ACTION = "ajax/change_mydon_profile.php";
const MODE = `[name="mode"]`;
const TOKEN = `[name="_tckt"]`;
const NAME_FIELD = "#newName";

/**
 * The flag the page hands the site's script that opens the dialog, in the call that wires its two
 * buttons: `$( '#rename_img' ).rename( '#dialog', '<name>', $( '#_tckt' ).val(),  '0' )`. Found by
 * the token argument before it, never by skipping over the name, which is a literal of the
 * player's own and may hold a quote.
 */
const RENAME_FLAG = /\$\(\s*'#_tckt'\s*\)\s*\.val\(\)\s*,\s*'([^']*)'/g;

/**
 * Whether Hiroba takes a rename, from the flag both buttons are given: `'0'` is open, `'1'` is
 * closed, and the site then shows 今はドンだーネームは変更できないドン！ and opens nothing. A page
 * with no flag, one that disagrees with itself and one with another value are `unknown`, and never
 * fail the page. `'0'` is the only value any capture has had.
 */
export function readRenameState(html: string): RenameState {
  const flags = [...html.matchAll(RENAME_FLAG)].map((match) => match[1]);
  if (flags.length > 0 && flags.every((flag) => flag === "0")) {
    return "open";
  }
  return flags.length > 0 && flags.every((flag) => flag === "1") ? "closed" : "unknown";
}

/**
 * Parses `mypage_top.php` as the editor a rename goes through. There is no rename page: the form is
 * a dialog in my page, so the page that shows the name is the page that writes it.
 *
 * - The form is `form#renameForm`, and there is exactly one. It must post to
 *   `ajax/change_mydon_profile.php`, with `mode` `name`.
 * - The token is the `_tckt` inside that form, held as a FormToken. The page has three of them, in
 *   no form, in the 大好きな曲 form and in this one; they have been equal on every capture, and this
 *   is the one the form posts.
 * - `oldName` and `newName` are in the form, and `newName` carries a `maxlength`. The site's
 *   script fills both with the current name when the dialog opens; here the name is read from the
 *   header it takes it from, as the profile reads it.
 */
export function parseRenameEditorPage(html: string): Result<RenameEditorReading, ParseFailure> {
  const page = parsePage(html, PAGE);
  if (isErr(page)) {
    return page;
  }
  const root = page.value;
  const form = formOf(root);
  if (isErr(form)) {
    return form;
  }
  const inputs = readInputs(form.value);
  if (isErr(inputs)) {
    return inputs;
  }
  const area = requireMarker(root, "#mydon_area", PAGE);
  if (isErr(area)) {
    return area;
  }
  const identity = readIdentity(area.value);
  if (isErr(identity)) {
    return identity;
  }
  return ok({
    state: { nickname: identity.value.nickname },
    token: inputs.value.token,
    maxLength: inputs.value.maxLength,
    rename: readRenameState(html),
  });
}

/** The one rename form on the page, which must post where a name is written. */
function formOf(root: HTMLElement): Result<HTMLElement, ParseFailure> {
  const forms = root.querySelectorAll(FORM);
  const [form] = forms;
  if (form === undefined) {
    return err({ kind: "missingMarker", page: PAGE, marker: FORM });
  }
  if (forms.length > 1) {
    return err({ kind: "unreadableValue", page: PAGE, marker: FORM, raw: `${forms.length} forms` });
  }
  const action = form.getAttribute("action") ?? "";
  return action === FORM_ACTION
    ? ok(form)
    : err({ kind: "unreadableValue", page: PAGE, marker: `${FORM}[action]`, raw: action });
}

/** What the form posts: its mode, its token, and how long a name its field takes. */
function readInputs(
  form: HTMLElement,
): Result<{ readonly token: FormToken; readonly maxLength: number }, ParseFailure> {
  const mode = requireMarker(form, MODE, PAGE);
  if (isErr(mode)) {
    return mode;
  }
  const modeValue = mode.value.getAttribute("value") ?? "";
  if (modeValue !== "name") {
    return err({ kind: "unreadableValue", page: PAGE, marker: `${FORM} ${MODE}`, raw: modeValue });
  }
  const tokenInput = requireMarker(form, TOKEN, PAGE);
  if (isErr(tokenInput)) {
    return tokenInput;
  }
  const token = tokenInput.value.getAttribute("value") ?? "";
  if (token === "") {
    // Never the value itself, even an empty one: the marker says enough.
    return err({ kind: "unreadableValue", page: PAGE, marker: `${FORM} ${TOKEN}`, raw: "" });
  }
  const oldName = requireMarker(form, "#oldName", PAGE);
  if (isErr(oldName)) {
    return oldName;
  }
  const field = requireMarker(form, NAME_FIELD, PAGE);
  if (isErr(field)) {
    return field;
  }
  const maxLength = field.value.getAttribute("maxlength") ?? "";
  if (!/^\d+$/.test(maxLength)) {
    const marker = `${FORM} ${NAME_FIELD}[maxlength]`;
    return err({ kind: "unreadableValue", page: PAGE, marker, raw: maxLength });
  }
  return ok({ token: new FormToken(token), maxLength: Number(maxLength) });
}
