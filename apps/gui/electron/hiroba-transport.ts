import { err, ok, type Transport, type TransportFailure } from "@abth/core";

import {
  encodeForm,
  FORM_CONTENT_TYPE,
  POST_FOLLOWED_AS_GET,
  resolveRedirect,
  SESSION_COOKIE_NAME,
} from "../src/hiroba-session";

const TIMEOUT_MS = 20_000;
/** Chrome's own limit. */
const MAX_REDIRECTS = 20;
const REDIRECT_STATUSES: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);
/**
 * Names a caller may not set: the session and the browser identity belong to this transport, and
 * so does the type of the body it encodes.
 */
const OWN_HEADERS: ReadonlySet<string> = new Set(["cookie", "user-agent", "content-type"]);

/** Where the desktop keeps the session: main-process memory, behind these two calls. */
export interface SessionCookieHolder {
  get(): string | null;
  set(value: string | null): void;
}

export interface HirobaTransportOptions {
  readonly session: SessionCookieHolder;
  /** A complete browser User-Agent; Hiroba answers anything else with a data-less page. */
  readonly userAgent: string;
  /** The only origin the session is ever sent to, e.g. `https://donderhiroba.jp`. */
  readonly hirobaOrigin: string;
  /** Node's fetch unless a test passes a stand-in. */
  readonly fetch?: (url: string, init: RequestInit) => Promise<Response>;
  readonly now?: () => number;
}

/**
 * The desktop's Transport, and the only code on the desktop that puts the session on a request.
 *
 * Node's own fetch (undici) in Electron's main process, which has no cookie jar and writes nothing
 * to disk. Redirects are followed here, one hop at a time (`redirect: "manual"`), so that each hop
 * decides for itself whether it goes to Hiroba's origin and gets the cookie, and so that a new
 * `_token_v2` Hiroba sets on any hop is taken up the way a browser would. `set-cookie` never
 * leaves this function.
 *
 * A post is sent once. Its form goes on the first hop only, encoded in the order given; a 301, 302
 * or 303 after it is followed with a bodyless GET, as a browser does, and a 307 or 308, which asks
 * for the post again, is handed back rather than followed.
 *
 * Electron's net.fetch is not used: it reports an empty `url` after a redirect, and its session
 * cookie jar overrides an explicit Cookie header.
 */
export function createHirobaTransport(options: HirobaTransportOptions): Transport {
  const fetchHop = options.fetch ?? ((url: string, init: RequestInit) => fetch(url, init));
  const now = options.now ?? Date.now;
  return {
    async send(request, signal) {
      const failure = (kind: TransportFailure["kind"]) => err({ kind, url: request.url });
      const timeout = AbortSignal.timeout(TIMEOUT_MS);
      const abort = signal === undefined ? timeout : AbortSignal.any([signal, timeout]);
      const callerHeaders: Record<string, string> = {};
      for (const [name, value] of Object.entries(request.headers ?? {})) {
        if (!OWN_HEADERS.has(name.toLowerCase())) {
          callerHeaders[name] = value;
        }
      }
      let url = request.url;
      let method = request.method;
      let payload = request.method === "POST" ? encodeForm(request.form) : undefined;
      try {
        for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
          const onHiroba = originOf(url) === options.hirobaOrigin;
          const headers: Record<string, string> = {
            ...callerHeaders,
            "User-Agent": options.userAgent,
          };
          if (payload !== undefined) {
            headers["Content-Type"] = FORM_CONTENT_TYPE;
          }
          const cookie = options.session.get();
          if (onHiroba && cookie !== null) {
            headers.Cookie = `${SESSION_COOKIE_NAME}=${cookie}`;
          }
          const response = await fetchHop(url, {
            method,
            headers,
            redirect: "manual",
            signal: abort,
            ...(payload !== undefined && { body: payload }),
          });
          if (onHiroba) {
            takeUpSessionCookie(
              response.headers.getSetCookie(),
              new URL(url).hostname,
              options,
              now,
            );
          }
          const location = response.headers.get("location");
          // A 307 or 308 after a post asks for the post again: that answer goes back unfollowed.
          const followed =
            REDIRECT_STATUSES.has(response.status) &&
            (method === "GET" || POST_FOLLOWED_AS_GET.has(response.status));
          if (followed && location !== null) {
            await response.body?.cancel();
            const next = resolveRedirect(location, url);
            if (next === null) {
              return failure("unreachable");
            }
            url = next;
            // Every hop after the first is a GET with no body, whatever the first one was.
            method = "GET";
            payload = undefined;
            continue;
          }
          const responseHeaders: Record<string, string> = {};
          response.headers.forEach((value, name) => {
            const lower = name.toLowerCase();
            if (lower !== "set-cookie") {
              responseHeaders[lower] = value;
            }
          });
          const body = new Uint8Array(await response.arrayBuffer());
          return ok({ status: response.status, url, headers: responseHeaders, body });
        }
        return failure("unreachable");
      } catch {
        // The error itself is not carried: it can quote the request, headers included.
        return failure(
          timeout.aborted ? "timedOut" : signal?.aborted ? "cancelled" : "unreachable",
        );
      }
    },
  };
}

/**
 * A browser's rules, cut down to the one cookie: an empty value, a Max-Age of zero or less, or an
 * Expires in the past ends the session; any other value replaces it. Max-Age wins over Expires
 * (RFC 6265 §5.3), and a Domain the host does not match is ignored, as a browser ignores it.
 */
function takeUpSessionCookie(
  lines: readonly string[],
  host: string,
  { session }: HirobaTransportOptions,
  now: () => number,
): void {
  for (const line of lines) {
    const [pair = "", ...attributes] = line.split(";");
    const equals = pair.indexOf("=");
    if (equals < 0 || pair.slice(0, equals).trim() !== SESSION_COOKIE_NAME) {
      continue;
    }
    const attribute = (wanted: string) =>
      attributes
        .map((raw) => raw.split("="))
        .find(([name]) => name?.trim().toLowerCase() === wanted)
        ?.slice(1)
        .join("=")
        .trim();
    const domain = attribute("domain")?.replace(/^\./, "").toLowerCase();
    if (domain !== undefined && domain !== "" && host !== domain && !host.endsWith(`.${domain}`)) {
      continue;
    }
    const value = pair.slice(equals + 1).trim();
    const maxAge = attribute("max-age");
    const expires = Date.parse(attribute("expires") ?? "");
    const ended =
      value === "" ||
      (maxAge !== undefined && /^-?\d+$/.test(maxAge)
        ? Number(maxAge) <= 0
        : !Number.isNaN(expires) && expires <= now());
    session.set(ended ? null : value);
  }
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
