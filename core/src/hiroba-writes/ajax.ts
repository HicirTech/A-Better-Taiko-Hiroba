import { parsePage } from "../hiroba-dom-parser";
import type { Transport, TransportPost, TransportResponse } from "../http-transport";
import { isErr } from "../operation-results";
import { landingOf, pathOf } from "./landing";
import type { AjaxAnswer, AjaxPost, PrecheckVerdict } from "./types";

/** What the site's jQuery sends for `dataType: "json"`. */
const ACCEPT_JSON = "application/json, text/javascript, */*; q=0.01";

/** Sends one ajax post, once, and sorts the answer; the only place a form token is revealed. */
export async function postAjax(
  transport: Transport,
  hirobaOrigin: string,
  post: AjaxPost,
): Promise<AjaxAnswer> {
  const request: TransportPost = {
    method: "POST",
    url: `${hirobaOrigin}/${post.path}`,
    headers: {
      // Without it Hiroba answers its error page at 200 and the write does not happen.
      "X-Requested-With": "XMLHttpRequest",
      Accept: ACCEPT_JSON,
      // Origin and Referer match a post made from inside the signed-in page.
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
  // Only Hiroba's own answer is the handler's: one that ended anywhere else is not read at all.
  if (landing === "elsewhere") {
    return { kind: "unexpected", code: `landing=elsewhere ${code}` };
  }
  const type = mediaTypeOf(response);
  const text = new TextDecoder("utf-8").decode(response.body);
  // JSON is read only from a 2xx: an error status with a JSON body is no handler's answer.
  if (type === "application/json" && response.status >= 200 && response.status < 300) {
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

/** Only boolean false clears; true, 1 and "1" (true to the site's `==`) ask for confirmation. */
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

/** A save's result code: a whole number or a digit string; anything else is null, never 0. */
export function readSaveCode(value: unknown): number | null {
  const result = memberOf(value, "result");
  if (typeof result === "number") {
    return Number.isInteger(result) ? result : null;
  }
  return typeof result === "string" && /^\d+$/.test(result) ? Number(result) : null;
}

/** The costume endpoint writes `errmsg`, the profile endpoint (name and title) `err_message`. */
const MESSAGE_MEMBERS = ["errmsg", "err_message"] as const;

export function readSaveMessage(value: unknown): string | null {
  for (const name of MESSAGE_MEMBERS) {
    const message = memberOf(value, name);
    if (typeof message === "string" && message !== "") {
      return message;
    }
  }
  return null;
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
