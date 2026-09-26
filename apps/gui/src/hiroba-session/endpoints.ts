import type { HirobaEndpoints } from "./types";

export const HIROBA_ENDPOINTS: HirobaEndpoints = {
  hirobaOrigin: "https://donderhiroba.jp",
  idpHost: "account.bandainamcoid.com",
};

/** The one cookie that is the Hiroba session. Only a platform transport ever reads its value. */
export const SESSION_COOKIE_NAME = "_token_v2";

/** Where a sign-in starts. Opened with no session, it shows Hiroba's own sign-in button. */
export const loginPageUrl = (endpoints: HirobaEndpoints): string =>
  `${endpoints.hirobaOrigin}/login.php`;

/** The first read: the signed-in player's own page. */
export const myPageUrl = (endpoints: HirobaEndpoints): string =>
  `${endpoints.hirobaOrigin}/mypage_top.php`;

/** The ID host's origin. It is served on the same scheme as Hiroba: https, or http for the mock. */
export const idpOrigin = (endpoints: HirobaEndpoints): string =>
  `${new URL(endpoints.hirobaOrigin).protocol}//${endpoints.idpHost}`;

/**
 * Development only: the endpoints a local stand-in asks for. Both overrides or neither; one alone
 * would quietly leave the other on the real site, so it stops the app instead.
 */
export function endpointsFromOverrides(
  hirobaOrigin: string | undefined,
  idpHost: string | undefined,
): HirobaEndpoints {
  const origin = hirobaOrigin ?? "";
  const host = idpHost ?? "";
  if (origin === "" && host === "") {
    return HIROBA_ENDPOINTS;
  }
  if (origin === "" || host === "") {
    throw new Error("Set both development endpoint overrides, or neither.");
  }
  return { hirobaOrigin: origin, idpHost: host };
}
