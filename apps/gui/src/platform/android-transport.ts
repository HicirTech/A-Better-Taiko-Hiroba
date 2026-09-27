import { err, ok, type Transport, type TransportFailure } from "@abth/core";
import { CapacitorHttp } from "@capacitor/core";

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
 * It reads and never posts. Writes are the desktop's alone for now (the user's call, 2026-09-27),
 * and a post here would need what this does not do: Capacitor drops a form body sent without a
 * Content-Type, and follows a post's redirects natively, repeating a 307 or 308. The Android port
 * enables no write, so a post that reaches this is a programming error, and throws.
 */
export function createAndroidTransport(userAgent: string = navigator.userAgent): Transport {
  return {
    async send(request, signal) {
      if (request.method !== "GET") {
        throw new Error("Android's transport does not post forms");
      }
      const failure = (kind: TransportFailure["kind"]) => err({ kind, url: request.url });
      if (signal?.aborted) {
        return failure("cancelled");
      }
      const headers: Record<string, string> = { "User-Agent": userAgent };
      for (const [name, value] of Object.entries(request.headers ?? {})) {
        if (!OWN_HEADERS.has(name.toLowerCase())) {
          headers[name] = value;
        }
      }
      try {
        // The native call cannot be aborted; a cancelled one is left to finish and ignored.
        const answer = await Promise.race([
          CapacitorHttp.request({
            url: request.url,
            method: request.method,
            headers,
            responseType: "arraybuffer",
            connectTimeout: TIMEOUT_MS,
            readTimeout: TIMEOUT_MS,
          }),
          abortion(signal),
        ]);
        if (answer === "cancelled") {
          return failure("cancelled");
        }
        const responseHeaders: Record<string, string> = {};
        for (const [name, value] of Object.entries(answer.headers)) {
          const lower = name.toLowerCase();
          if (lower !== "set-cookie") {
            responseHeaders[lower] = value;
          }
        }
        return ok({
          status: answer.status,
          url: answer.url,
          headers: responseHeaders,
          body: bodyBytes(answer.data, answer.status, responseHeaders["content-type"]),
        });
      } catch (error) {
        return failure(isTimeout(error) ? "timedOut" : "unreachable");
      }
    },
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
