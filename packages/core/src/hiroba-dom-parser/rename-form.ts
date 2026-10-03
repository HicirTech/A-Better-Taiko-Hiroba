import type { HTMLElement } from "node-html-parser";

import { FormToken, type RenameState } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { readIdentity } from "./identity-reader";
import { parsePage, requireMarker } from "./parser";
import type { ParseFailure, RenameEditorReading } from "./types";

const PAGE = "mypage_top.php";
const FORM = "form#renameForm";
const FORM_ACTION = "ajax/change_mydon_profile.php";
const MODE = `[name="mode"]`;
const TOKEN = `[name="_tckt"]`;
const NAME_FIELD = "#newName";

// The last argument of the rename call, matched from the token argument before it: the name
// literal ahead of that may hold a quote.
const RENAME_FLAG = /\$\(\s*'#_tckt'\s*\)\s*\.val\(\)\s*,\s*'([^']*)'/g;

/** `'0'` is open and `'1'` closed; anything else is `unknown`, and never fails the page. */
export function readRenameState(html: string): RenameState {
  const flags = [...html.matchAll(RENAME_FLAG)].map((match) => match[1]);
  if (flags.length > 0 && flags.every((flag) => flag === "0")) {
    return "open";
  }
  return flags.length > 0 && flags.every((flag) => flag === "1") ? "closed" : "unknown";
}

/** Parses `mypage_top.php` as the rename editor: there is no rename page, the form is a dialog. */
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
  // The dialog's script fills the form's names from the header, so the name is read there.
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
  // The page has three `_tckt`; take this form's own, the one it posts.
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
