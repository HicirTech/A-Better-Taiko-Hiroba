import { type HTMLElement, parse } from "node-html-parser";

import { err, ok, type Result } from "../operation-results";
import type { ParseFailure } from "./types";

/**
 * Unique to the login page: across every captured page, only the logged-out answer carries the
 * login form (it submits to login_process.php). Logged-in pages never do.
 */
const LOGIN_FORM_MARKER = "form#login_form";

/**
 * The site's own error page, which arrives at **HTTP 200** with an ordinary content type, so
 * nothing below the body distinguishes it from a page that worked.
 *
 * Matched on the heading rather than on any message. Four messages are known and a fifth should be
 * expected; a detector keyed on the text misses whichever one nobody has met yet. Note this is not
 * the site's *other* no-data container (`div#error.contentBox.errorArea`, which an empty list or a
 * ranking with no entries uses) — that one is an ordinary page saying it has nothing, and reading
 * it as a failure would turn "no friends yet" into an error.
 */
const ERROR_SHELL_MARKER = "h1";
const ERROR_SHELL_HEADING = "エラー";

/**
 * Parses a fetched Hiroba page and refuses the login page.
 *
 * `page` is the page that was requested (for example "mypage_top.php"); it travels into every
 * failure so the caller never has to guess which fetch went wrong. Parsing itself is lenient and
 * never throws — an unrecognisable body simply yields a document in which the markers a parser
 * then asks for are missing.
 */
export function parsePage(html: string, page: string): Result<HTMLElement, ParseFailure> {
  const root = parse(html);
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

/** Finds one element or fails naming the page and the selector that found nothing. */
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
