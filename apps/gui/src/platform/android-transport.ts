import { err, ok, type Transport, type TransportFailure } from "@abth/core";
import { CapacitorHttp } from "@capacitor/core";

const TIMEOUT_MS = 20_000;
/** A caller never supplies these two: the session and the browser identity are this transport's. */
const OWN_HEADERS: ReadonlySet<string> = new Set(["cookie", "user-agent"]);

/**
 * Android's Transport: Capacitor's native HTTP client, which takes cookies from the WebView's own
 * cookie store. The in-app sign-in left `_token_v2` there, so the platform attaches it and no
 * TypeScript ever holds its value. Sending a Cookie header here would add a second one, not
 * replace the stored one, which is why a caller's is dropped.
 *
 * The body comes back as the platform's UTF-8 text (`responseType: "text"`) and is re-encoded.
 * Capacitor reads it line by line, so line breaks come back as `\n` and the last one is dropped,
 * and it parses a JSON answer whatever the response type says (HttpRequestHandler.readData), so
 * that comes back re-serialised. Neither matters to a page parser. Images will need
 * `arraybuffer`, which Capacitor returns as base64; that belongs to the later HirobaClient.
 */
export function createAndroidTransport(userAgent: string = navigator.userAgent): Transport {
  return {
    async send(request, signal) {
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
            responseType: "text",
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
        const text = typeof answer.data === "string" ? answer.data : JSON.stringify(answer.data);
        return ok({
          status: answer.status,
          url: answer.url,
          headers: responseHeaders,
          body: new TextEncoder().encode(text),
        });
      } catch (error) {
        return failure(isTimeout(error) ? "timedOut" : "unreachable");
      }
    },
  };
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
