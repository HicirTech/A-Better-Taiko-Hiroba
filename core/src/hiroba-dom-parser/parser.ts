import { type HTMLElement, parse } from "node-html-parser";

import { err, ok, type Result } from "../operation-results";
import type { ParseFailure } from "./types";

/** Only the logged-out answer carries the login form; logged-in pages never do. */
const LOGIN_FORM_MARKER = "form#login_form";

// Hiroba's error page arrives at HTTP 200, headed in Japanese or in English: match its heading,
// never a message, which varies.
// The no-data container (`div#error.contentBox.errorArea`) is an ordinary page, not an error.
const ERROR_SHELL_MARKER = "h1";
const ERROR_SHELL_HEADINGS: ReadonlySet<string> = new Set(["エラー", "Error"]);

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
  if (ERROR_SHELL_HEADINGS.has(root.querySelector(ERROR_SHELL_MARKER)?.text.trim() ?? "")) {
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
