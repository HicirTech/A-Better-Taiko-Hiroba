import { idpOrigin } from "./endpoints";
import type { HirobaEndpoints, SignInStep } from "./types";

const HIROBA_LOGIN_PATHS: ReadonlySet<string> = new Set(["/login.php", "/login_process.php"]);
const CARD_SELECT_PATH = "/login_select.php";
/**
 * An allow-list, not "anything that is not a login page": the in-app browser on Android reports
 * every redirect hop, and the Hiroba callback hop, whose name is unknown, must not count as done.
 */
const LANDING_PATHS: ReadonlySet<string> = new Set(["/index.php"]);

/**
 * Classifies a URL by parsed origin and path. The whole URL is never searched for a host name: the
 * OAuth round trip carries `donderhiroba.jp` in its own query string.
 *
 * Schemes and ports are compared exactly, so either site on another scheme is elsewhere: the
 * desktop sign-in window has no address bar, and a plain-http page there would look like the real
 * form. Hiroba is one origin. The ID side is a domain, not a host: the real walk goes through
 * `www.bandainamcoid.com/v2/oauth2/auth` on its way to the form on `account.bandainamcoid.com`, and
 * a host-only rule stopped the sign-in dead at that hop. The domain is matched on a label boundary,
 * so `evilbandainamcoid.com` is elsewhere. Endpoints that do not parse make every URL elsewhere, so
 * a bad override fails closed.
 */
export function signInStep(rawUrl: string | undefined, endpoints: HirobaEndpoints): SignInStep {
  let url: URL;
  let hiroba: URL;
  let idp: URL;
  try {
    url = new URL(rawUrl ?? "");
    hiroba = new URL(endpoints.hirobaOrigin);
    idp = new URL(idpOrigin(endpoints));
  } catch {
    return "elsewhere";
  }
  if (isOnIdpDomain(url, idp, endpoints.idpDomain.toLowerCase())) {
    return "idp";
  }
  if (url.origin !== hiroba.origin) {
    return "elsewhere";
  }
  if (HIROBA_LOGIN_PATHS.has(url.pathname)) {
    return "hirobaLogin";
  }
  if (url.pathname === CARD_SELECT_PATH) {
    return "cardSelect";
  }
  return LANDING_PATHS.has(url.pathname) ? "landed" : "otherHiroba";
}

function isOnIdpDomain(url: URL, idp: URL, domain: string): boolean {
  if (domain === "" || url.protocol !== idp.protocol || url.port !== idp.port) {
    return false;
  }
  return url.hostname === domain || url.hostname.endsWith(`.${domain}`);
}
