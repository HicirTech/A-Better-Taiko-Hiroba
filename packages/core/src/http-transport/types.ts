import type { Result } from "../operation-results";

/**
 * One page request, as the code that wants the page states it.
 *
 * It names no session. The transport adds the session cookie; code that asks for pages never sees
 * it. The transport also identifies itself as a complete browser, because Hiroba answers anything
 * else with a data-less "recommended browsers" page at HTTP 200.
 */
export interface TransportRequest {
  readonly method: "GET";
  readonly url: string;
  /**
   * Headers the page needs beyond the session and the browser identity. A transport drops any
   * `Cookie` or `User-Agent` given here; those two are its own.
   */
  readonly headers?: Readonly<Record<string, string>>;
}

/** What the last server answered, after the redirects the transport followed. */
export interface TransportResponse {
  /** Hiroba answers a lost session, an error page and a refused request alike with 200. */
  readonly status: number;
  /**
   * The final URL. A lost session ends here at `/login.php`, and a redirect off Hiroba ends on the
   * other host, so this, not `status`, is the first thing to read.
   */
  readonly url: string;
  /** Names lower-cased. Never contains `set-cookie`: the session stays with the transport. */
  readonly headers: Readonly<Record<string, string>>;
  /**
   * The body as the server sent it: a page to decode as UTF-8, or an image's bytes. Two answers
   * come back re-encoded from the platform's text on Android, where Capacitor hands over no bytes
   * for them: one with a JSON content type, re-serialised, and one of status 400 or more, whose
   * line breaks become `\n` with the last dropped. Page parsers are indifferent to both, and
   * neither is an image.
   */
  readonly body: Uint8Array;
}

/**
 * The request never produced an answer. Every answer a server gives, whatever its status, is a
 * response instead. Carries no header, cookie or body.
 */
export interface TransportFailure {
  readonly kind: "unreachable" | "timedOut" | "cancelled";
  /** The URL that was requested. */
  readonly url: string;
}

/**
 * The seam between the core and a platform's network stack.
 *
 * An implementation holds the session and adds it to each request; code that asks for pages never
 * sees the cookie. It follows redirects, including ones to another host, and reports the final
 * URL, but it sends the session only to Hiroba's own origin.
 *
 * It keeps the session current the way a browser would: a new session cookie that Hiroba sets on
 * any hop replaces the old one from that hop on, and one that Hiroba expires ends the session.
 */
export interface Transport {
  send(
    request: TransportRequest,
    signal?: AbortSignal,
  ): Promise<Result<TransportResponse, TransportFailure>>;
}
