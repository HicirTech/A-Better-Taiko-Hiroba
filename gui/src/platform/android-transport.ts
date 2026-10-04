import { err, ok, type Transport, type TransportFailure, type TransportResponse } from "@abth/core";
import { CapacitorHttp, type HttpOptions, type HttpResponse } from "@capacitor/core";

import {
  encodeForm,
  FORM_CONTENT_TYPE,
  POST_FOLLOWED_AS_GET,
  resolveRedirect,
} from "../hiroba-session";

const TIMEOUT_MS = 20_000;
/** The session, browser identity and body type are this transport's own; a caller's Cookie header
 * would be a second one beside the stored cookie, not a replacement. */
const OWN_HEADERS: ReadonlySet<string> = new Set(["cookie", "user-agent", "content-type"]);

/** Android's Transport: Capacitor's native HTTP client, which takes cookies from the WebView's own
 * cookie store, so no TypeScript ever holds the session's value. */
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
        // Capacitor writes no body to a request without a Content-Type, and encodes an object's
        // keys in its own order: so the form goes as one string, already encoded in order.
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
        // A 301, 302 or 303 is followed here with one GET without a body, as a browser does. A 307
        // or 308, which asks for the post again, comes back as it is, as the desktop's does.
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

// Capacitor opens one connection per call and adds no retry. A native call cannot be aborted: a
// cancelled one is left to finish and ignored.
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

// Capacitor 8.5 answers base64 of the exact bytes, but a parsed value for a JSON content type and
// line-joined text for status 400 and up: those two are re-encoded as UTF-8, and are not exact.
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

// Capacitor rejects with the Java exception's class name as `code`; connect and read timeouts are
// both a SocketTimeoutException.
function isTimeout(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "SocketTimeoutException"
  );
}
