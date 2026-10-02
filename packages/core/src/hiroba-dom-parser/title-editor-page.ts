import type { HTMLElement } from "node-html-parser";

import { FormToken, type TitleOption } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { parsePage, requireMarker } from "./parser";
import type { ParseFailure, TitleEditorReading } from "./types";

const PAGE = "mypage_title_edit.php";
/**
 * The list of the titles the account owns. The form that writes is found from it, never by its id
 * or name: the title page and the parts composer swap them (wiki: Writing Titles and Name).
 */
const LIST = "select#newTitle";
/** Where the form that writes a title posts: the page's identity. */
const FORM_ACTION = "ajax/change_mydon_profile.php";
/** The title being worn, as the page's heading prints it. */
const HEADING = "#title_parts_comp";
const TOKEN = `[name="_tckt"]`;
/** The list's two leading entries, which are no titles: "choose a title", and 称号をはずす. */
const CHOOSE_VALUE = "";
const REMOVE_VALUE = "-";
/** What the page's script reads off the block that was clicked, and the values the handler wants. */
const FORM_INPUTS = [
  ["input#mode", "title"],
  ["input.getStatus", "1"],
  ["input.setTitle", "on"],
] as const;

/**
 * Parses `mypage_title_edit.php` as the editor a title write goes through: the title it shows as
 * worn, the token that writes one, and every title the account owns.
 *
 * - The page is parsed with its unclosed tags kept. It has a `<div>` it never closes, inside its
 *   form, and parsed as other pages are, the document has no form: `select#newTitle`, the token and
 *   the inputs are found by id, but nothing is inside a form.
 * - The form is the one the list is in, and must post to `ajax/change_mydon_profile.php`. In it,
 *   `mode` must be `title`, and `getStatus` and `setTitle` must hold the values the page sends: a
 *   different `setTitle` takes another path in the site's handler.
 * - The token is the form's own `_tckt`, held as a FormToken.
 * - The worn title is the heading's text, trimmed. No page gives its id: the list's `selected`
 *   entry is the "choose" one, whoever wears what, and is ignored.
 * - The list is the "choose" entry, then 称号をはずす, then one entry per title owned, whose value is
 *   the title's id: whole numbers, none repeated, each with a name. A name may repeat under another
 *   id, and each is kept as its own option.
 */
export function parseTitleEditorPage(html: string): Result<TitleEditorReading, ParseFailure> {
  const page = parsePage(html, PAGE, { keepUnclosedTags: true });
  if (isErr(page)) {
    return page;
  }
  const root = page.value;
  const list = requireMarker(root, LIST, PAGE);
  if (isErr(list)) {
    return list;
  }
  const form = formOf(list.value);
  if (isErr(form)) {
    return form;
  }
  const wrong = checkInputs(form.value);
  if (wrong !== null) {
    return err(wrong);
  }
  const token = readToken(form.value);
  if (isErr(token)) {
    return token;
  }
  const heading = requireMarker(root, HEADING, PAGE);
  if (isErr(heading)) {
    return heading;
  }
  const options = readOptions(list.value);
  if (isErr(options)) {
    return options;
  }
  return ok({
    state: { title: heading.value.text.trim() },
    token: token.value,
    options: options.value,
  });
}

/** The form the list is in, which must post where a title is written. */
function formOf(list: HTMLElement): Result<HTMLElement, ParseFailure> {
  const form = list.closest("form");
  if (form === null) {
    return err({ kind: "missingMarker", page: PAGE, marker: `form ${LIST}` });
  }
  const action = form.getAttribute("action") ?? "";
  return action === FORM_ACTION
    ? ok(form)
    : err({ kind: "unreadableValue", page: PAGE, marker: `form[action] ${LIST}`, raw: action });
}

/**
 * The first input the page's script reads that is missing from the form, or does not hold the value
 * the handler is sent; null when all do.
 */
function checkInputs(form: HTMLElement): ParseFailure | null {
  for (const [marker, wanted] of FORM_INPUTS) {
    const input = requireMarker(form, marker, PAGE);
    if (isErr(input)) {
      return input.error;
    }
    const raw = input.value.getAttribute("value") ?? "";
    if (raw !== wanted) {
      return { kind: "unreadableValue", page: PAGE, marker, raw };
    }
  }
  return null;
}

function readToken(form: HTMLElement): Result<FormToken, ParseFailure> {
  const input = requireMarker(form, TOKEN, PAGE);
  if (isErr(input)) {
    return input;
  }
  const token = input.value.getAttribute("value") ?? "";
  // Never the value itself, even an empty one: the marker says enough.
  return token === ""
    ? err({ kind: "unreadableValue", page: PAGE, marker: `form ${TOKEN}`, raw: "" })
    : ok(new FormToken(token));
}

/** The owned titles, in page order, after the two entries that are none. */
function readOptions(list: HTMLElement): Result<TitleOption[], ParseFailure> {
  const marker = `${LIST} option`;
  const entries = list.querySelectorAll("option");
  const [choose, remove, ...titles] = entries;
  for (const [entry, wanted] of [
    [choose, CHOOSE_VALUE],
    [remove, REMOVE_VALUE],
  ] as const) {
    const raw = entry?.getAttribute("value");
    if (raw !== wanted) {
      return err({ kind: "unreadableValue", page: PAGE, marker, raw: raw ?? "(no entry)" });
    }
  }
  const options: TitleOption[] = [];
  for (const title of titles) {
    const value = title.getAttribute("value") ?? "";
    const label = title.text.trim();
    const id = Number(value);
    if (!/^\d+$/.test(value) || label === "" || options.some((one) => one.id === id)) {
      return err({ kind: "unreadableValue", page: PAGE, marker, raw: value });
    }
    options.push({ id, label });
  }
  return ok(options);
}
