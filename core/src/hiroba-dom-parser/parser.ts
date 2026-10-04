import { type HTMLElement, parse } from "node-html-parser";

import { err, ok, type Result } from "../operation-results";
import type { ParseFailure } from "./types";

/** Only the logged-out answer carries the login form; logged-in pages never do. */
const LOGIN_FORM_MARKER = "form#login_form";

// Hiroba's error page arrives at HTTP 200: match its heading, never a message (a fifth is likely).
// The no-data container (`div#error.contentBox.errorArea`) is an ordinary page, not an error.
const ERROR_SHELL_MARKER = "h1";
const ERROR_SHELL_HEADING = "エラー";

export interface ParseOptions {
  /** Keeps unclosed tags; otherwise a stray `<div>` makes the parser drop the title page's form. */
  readonly keepUnclosedTags?: boolean;
}

/** Parses a Hiroba page, refusing the login page; `page` names the request in every failure. */
export function parsePage(
  html: string,
  page: string,
  options: ParseOptions = {},
): Result<HTMLElement, ParseFailure> {
  const root = parse(html, options.keepUnclosedTags === true ? { parseNoneClosedTags: true } : {});
  if (root.querySelector(LOGIN_FORM_MARKER) !== null) {
    return err({ kind: "loggedOut", page });
  }
  if (root.querySelector(ERROR_SHELL_MARKER)?.text.trim() === ERROR_SHELL_HEADING) {
    return err({
      kind: "siteError",
      page,
      message: root.querySelector("table")?.text.trim().replace(/\s+/g, " ") ?? "",
    });
  }
  return ok(root);
}

export function requireMarker(
  root: HTMLElement,
  marker: string,
  page: string,
): Result<HTMLElement, ParseFailure> {
  const element = root.querySelector(marker);
  if (element === null) {
    return err({ kind: "missingMarker", page, marker });
  }
  return ok(element);
}
