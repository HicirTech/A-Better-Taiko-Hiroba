import { parsePage } from "../hiroba-dom-parser";
import type { Transport, TransportPost, TransportResponse } from "../http-transport";
import { isErr } from "../operation-results";
import { landingOf, pathOf } from "./landing";
import type { AjaxAnswer, AjaxPost, PrecheckVerdict } from "./types";

/**
 * What the site's jQuery sends with an ajax post, `dataType: "json"`. The executed writes of
 * 2026-08-09 were sent from inside the signed-in page, so they also carried its Origin and a
 * Referer of the page that posts; those two are sent here to match that shape.
 */
const ACCEPT_JSON = "application/json, text/javascript, */*; q=0.01";

/**
 * Sends one ajax post, once, and sorts what came back. The only place a write's post is built,
 * and so the only place a form token is revealed.
 *
 * `X-Requested-With` goes on every post: without it Hiroba answers its error page at 200 and the
 * write does not happen (executed on update_score.php, 2026-08-09). The order of the sorting is
 * the order of trust: no answer; an answer that ended on the login or card-select page; JSON,
 * which is how every handler seen answers; the site's error page; a 404; anything else. Nothing
 * here retries.
 */
export async function postAjax(
  transport: Transport,
  hirobaOrigin: string,
  post: AjaxPost,
): Promise<AjaxAnswer> {
  const request: TransportPost = {
    method: "POST",
    url: `${hirobaOrigin}/${post.path}`,
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      Accept: ACCEPT_JSON,
      Origin: hirobaOrigin,
      Referer: `${hirobaOrigin}/${post.referer}`,
    },
    form: post.form.map(([name, value]) => [
      name,
      typeof value === "string" ? value : value.reveal(),
    ]),
  };
  const sent = await transport.send(request);
  if (isErr(sent)) {
    return { kind: "noAnswer", failure: sent.error.kind, code: `noAnswer=${sent.error.kind}` };
  }
  const response = sent.value;
  const code = describeAnswer(response);
  const landing = landingOf(response.url, hirobaOrigin);
  if (landing === "login" || landing === "cardSelect") {
    return { kind: "endedAtLogin", code };
  }
  const type = mediaTypeOf(response);
  const text = new TextDecoder("utf-8").decode(response.body);
  if (type === "application/json") {
    try {
      return { kind: "json", value: JSON.parse(text.replace(/^﻿/, "")), code };
    } catch {
      return { kind: "unexpected", code: `${code} json=unparsed` };
    }
  }
  if (type === "text/html") {
    const page = parsePage(text, post.path);
    if (isErr(page) && page.error.kind === "siteError") {
      return { kind: "rejected", code };
    }
    if (isErr(page) && page.error.kind === "loggedOut") {
      return { kind: "endedAtLogin", code };
    }
  }
  if (response.status === 404) {
    return { kind: "endpointMissing", code };
  }
  return { kind: "unexpected", code };
}

/**
 * The pre-check's verdict. Only the boolean false is clear; `true`, `1` and `"1"`, which the
 * site's `== true` reads as true, ask for a confirmation; any other value stops the write.
 */
export function readPrecheck(answer: AjaxAnswer): PrecheckVerdict {
  if (answer.kind !== "json") {
    return answer.kind;
  }
  const result = memberOf(answer.value, "result");
  if (result === false) {
    return "clear";
  }
  return result === true || result === 1 || result === "1" ? "needsConfirmation" : "unexpected";
}

/**
 * A save's result code, strictly: a whole number, or a string of digits, which is how one handler
 * writes it. Anything else — `""`, null, false, a fraction, a missing result — is null, never read
 * as 0 the way `Number()` would read it.
 */
export function readSaveCode(value: unknown): number | null {
  const result = memberOf(value, "result");
  if (typeof result === "number") {
    return Number.isInteger(result) ? result : null;
  }
  return typeof result === "string" && /^\d+$/.test(result) ? Number(result) : null;
}

/** The message a save came back with (`errmsg`), as plain text; null when there is none. */
export function readSaveMessage(value: unknown): string | null {
  const message = memberOf(value, "errmsg");
  return typeof message === "string" && message !== "" ? message : null;
}

function memberOf(value: unknown, name: string): unknown {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)[name]
    : undefined;
}

function mediaTypeOf(response: TransportResponse): string {
  return (response.headers["content-type"] ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
}

/** Codes for a report: where the answer ended, status, type and size. Never the body. */
export function describeAnswer(response: TransportResponse): string {
  return [
    `path=${pathOf(response.url)}`,
    `status=${response.status}`,
    `type=${response.headers["content-type"] ?? "-"}`,
    `bytes=${response.body.byteLength}`,
  ].join(" ");
}
