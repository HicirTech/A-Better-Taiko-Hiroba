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
