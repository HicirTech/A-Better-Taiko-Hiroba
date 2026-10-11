import { idpOrigin } from "./endpoints";
import type { HirobaEndpoints, SignInStep } from "./types";

const HIROBA_LOGIN_PATHS: ReadonlySet<string> = new Set(["/login.php", "/login_process.php"]);
const CARD_SELECT_PATH = "/login_select.php";
// An allow-list: Android's in-app browser reports every redirect hop, and the Hiroba callback hop,
// whose name is unknown, must not count as done.
const LANDING_PATHS: ReadonlySet<string> = new Set(["/index.php"]);

/** Classifies a URL by parsed origin and path, never by searching it for a host name: the OAuth
 * round trip carries `donderhiroba.jp` in its own query. Scheme and port are compared exactly. */
export function signInStep(rawUrl: string | undefined, endpoints: HirobaEndpoints): SignInStep {
  let url: URL;
  let hiroba: URL;
  let idp: URL;
  try {
    url = new URL(rawUrl ?? "");
    hiroba = new URL(endpoints.hirobaOrigin);
    idp = new URL(idpOrigin(endpoints));
  } catch {
    // Endpoints that do not parse make every URL elsewhere, so a bad override fails closed.
    return "elsewhere";
  }
  if (url.protocol === hiroba.protocol && (endpoints.refusingHosts ?? []).includes(url.host)) {
    return "refuser";
  }
  if (isOnIdpDomain(url, idp, endpoints.idpDomain.toLowerCase())) {
    return "idp";
  }
  if (url.origin !== hiroba.origin) {
    return url.protocol === "https:" ? "service" : "elsewhere";
  }
  if (HIROBA_LOGIN_PATHS.has(url.pathname)) {
    return "hirobaLogin";
  }
  if (url.pathname === CARD_SELECT_PATH) {
    return "cardSelect";
  }
  return LANDING_PATHS.has(url.pathname) ? "landed" : "otherHiroba";
}

/** The host only: a sign-in URL's path and query carry OAuth state that must not reach the UI. */
export function signInHost(rawUrl: string | undefined): string {
  try {
    return new URL(rawUrl ?? "").host || "?";
  } catch {
    return "?";
  }
}

function isOnIdpDomain(url: URL, idp: URL, domain: string): boolean {
  if (domain === "" || url.protocol !== idp.protocol || url.port !== idp.port) {
    return false;
  }
  return url.hostname === domain || url.hostname.endsWith(`.${domain}`);
}
