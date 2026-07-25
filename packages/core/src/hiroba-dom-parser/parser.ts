import { type HTMLElement, parse } from "node-html-parser";

import { err, ok, type Result } from "../operation-results";
import type { ParseFailure } from "./types";

/**
 * Unique to the login page: across every captured page, only the logged-out answer carries the
 * login form (it submits to login_process.php). Logged-in pages never do.
 */
const LOGIN_FORM_MARKER = "form#login_form";

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
