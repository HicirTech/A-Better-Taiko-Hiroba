import type { Result } from "../operation-results";

/** A page to read or a form to post. It names no session: the transport adds the cookie. */
export type TransportRequest = TransportGet | TransportPost;

export interface TransportGet {
  readonly method: "GET";
  readonly url: string;
  /** Extra headers; the transport drops `Cookie`, `User-Agent` and `Content-Type` (its own). */
  readonly headers?: Readonly<Record<string, string>>;
}

// Encoded in the order given as `application/x-www-form-urlencoded; charset=UTF-8`, and sent once:
// a 301, 302 or 303 follows as a body-less GET; a 307 or 308, which would repeat it, does not.
export interface TransportPost {
  readonly method: "POST";
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly form: readonly (readonly [name: string, value: string])[];
}

export interface TransportResponse {
  /** Hiroba answers a lost session, an error page and a refused request alike with 200. */
  readonly status: number;
  /** The final URL, to read before `status`: a lost session ends at `/login.php`. */
  readonly url: string;
  /** Names lower-cased. Never contains `set-cookie`: the session stays with the transport. */
  readonly headers: Readonly<Record<string, string>>;
  // On Android (Capacitor hands over no bytes) a JSON answer comes back re-serialised and a 400+
  // one with its line breaks as \n, the last dropped. Parsers do not mind; neither is an image.
  readonly body: Uint8Array;
}

/** The request produced no answer; after a post, a timed-out one may still have been saved. */
export interface TransportFailure {
  readonly kind: "unreachable" | "timedOut" | "cancelled";
  readonly url: string;
}

// The seam to a platform's network stack. It alone holds the session cookie, sent only to Hiroba;
// it follows redirects, sends each request once, takes a rotated cookie and ends on an expired one.
export interface Transport {
  send(
    request: TransportRequest,
    signal?: AbortSignal,
  ): Promise<Result<TransportResponse, TransportFailure>>;
}
