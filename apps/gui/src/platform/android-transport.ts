import { err, ok, type Transport, type TransportFailure, type TransportResponse } from "@abth/core";
import { CapacitorHttp, type HttpOptions, type HttpResponse } from "@capacitor/core";

import {
  encodeForm,
  FORM_CONTENT_TYPE,
  POST_FOLLOWED_AS_GET,
  resolveRedirect,
} from "../hiroba-session";

const TIMEOUT_MS = 20_000;
/**
 * A caller never supplies these: the session and the browser identity are this transport's, and so
 * is a body's type, per the Transport contract.
 */
const OWN_HEADERS: ReadonlySet<string> = new Set(["cookie", "user-agent", "content-type"]);

/**
 * Android's Transport: Capacitor's native HTTP client, which takes cookies from the WebView's own
 * cookie store. The in-app sign-in left `_token_v2` there, so the platform attaches it and no
 * TypeScript ever holds its value. Sending a Cookie header here would add a second one, not
 * replace the stored one, which is why a caller's is dropped.
 *
 * The body is asked for as `arraybuffer`, so an image arrives byte for byte and a page arrives as
 * the bytes Hiroba sent, for decoding as UTF-8. See `bodyBytes` for what Capacitor hands back.
 *
 * A post is one native call, sent once, with its form as one string already encoded in the order
 * given and a Content-Type of this transport's own: Capacitor writes no body at all to a request
 * without one, and would encode an object's keys itself, in its own order. Redirects after a post
 * are not the platform's to follow: it is asked to hand back the first answer, and a 301, 302 or
 * 303 is then followed here with one GET that has no body, as a browser follows one. That GET is
 * an ordinary read, so the platform follows its redirects itself and the final URL is the one
 * reported. A 307 or 308, which asks for the post again, comes back as it is, with the post's own
 * URL, as the desktop's does.
 */
export function createAndroidTransport(userAgent: string = navigator.userAgent): Transport {
  return {
    async send(request, signal) {
      const failure = (kind: TransportFailure["kind"]) => err({ kind, url: request.url });
      const answered = (answer: HttpResponse | "cancelled") =>
        answer === "cancelled" ? failure("cancelled") : ok(respond(answer));
      if (signal?.aborted) {
        return failure("cancelled");
      }
      const headers: Record<string, string> = { "User-Agent": userAgent };
      for (const [name, value] of Object.entries(request.headers ?? {})) {
        if (!OWN_HEADERS.has(name.toLowerCase())) {
          headers[name] = value;
        }
      }
      const get = (url: string) => nativeCall({ url, method: "GET", headers }, signal);
      try {
        if (request.method === "GET") {
          return answered(await get(request.url));
        }
        const posted = await nativeCall(
          {
            url: request.url,
            method: "POST",
            headers: { ...headers, "Content-Type": FORM_CONTENT_TYPE },
            data: encodeForm(request.form),
            disableRedirects: true,
          },
          signal,
        );
        if (posted === "cancelled") {
          return failure("cancelled");
        }
        const first = respond(posted);
        const location = first.headers.location;
        if (!POST_FOLLOWED_AS_GET.has(first.status) || location === undefined) {
          return ok(first);
        }
        const next = resolveRedirect(location, request.url);
        return next === null ? failure("unreachable") : answered(await get(next));
      } catch (error) {
        return failure(isTimeout(error) ? "timedOut" : "unreachable");
      }
    },
  };
}

/**
 * One native call: Capacitor opens one connection for it and adds no retry of its own. It cannot be
 * aborted, though: a cancelled call is left to finish and ignored.
 */
function nativeCall(
  options: HttpOptions,
  signal: AbortSignal | undefined,
): Promise<HttpResponse | "cancelled"> {
  return Promise.race([
    CapacitorHttp.request({
      responseType: "arraybuffer",
      connectTimeout: TIMEOUT_MS,
      readTimeout: TIMEOUT_MS,
      ...options,
    }),
    abortion(signal),
  ]);
}

/** What the core reads of an answer: header names lower-cased, and no `set-cookie` at all. */
function respond(answer: HttpResponse): TransportResponse {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(answer.headers)) {
    const lower = name.toLowerCase();
    if (lower !== "set-cookie") {
      headers[lower] = value;
    }
  }
  return {
    status: answer.status,
    url: answer.url,
    headers,
    body: bodyBytes(answer.data, answer.status, headers["content-type"]),
  };
}

/**
 * The body as bytes. Asked for `arraybuffer`, Capacitor 8.5 answers in one of three ways
 * (HttpRequestHandler.readData):
 *
 * - base64 of the exact bytes, in lines of 76 (android.util.Base64.DEFAULT): every answer below 400
 *   whose content type does not contain `application/json`, pages and images alike;
 * - a value it parsed, whatever was asked for, when the content type contains `application/json`:
 *   an object, a number, a boolean, or a string with its quotes taken off;
 * - text, read line by line so line breaks become `\n` and the last is dropped, for an answer of 400
 *   or more: it reads those from the error stream and never as base64.
 *
 * Only the first is exact. The other two are re-encoded as UTF-8, as every page was before.
 */
function bodyBytes(data: unknown, status: number, contentType = ""): Uint8Array {
  if (typeof data !== "string") {
    return new TextEncoder().encode(JSON.stringify(data));
  }
  if (status >= 400 || contentType.toLowerCase().includes("application/json")) {
    return new TextEncoder().encode(data);
  }
  const binary = atob(data.replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function abortion(signal: AbortSignal | undefined): Promise<"cancelled"> {
  return new Promise((resolve) => {
    signal?.addEventListener("abort", () => resolve("cancelled"), { once: true });
  });
}

/**
 * Capacitor rejects with the Java exception's class name as `code` (CapacitorHttp.java). Both a
 * connect and a read timeout are a java.net.SocketTimeoutException; their messages differ.
 */
function isTimeout(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "SocketTimeoutException"
  );
}
