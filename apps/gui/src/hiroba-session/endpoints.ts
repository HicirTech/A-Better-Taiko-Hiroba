import type { HirobaEndpoints } from "./types";

export const HIROBA_ENDPOINTS: HirobaEndpoints = {
  hirobaOrigin: "https://donderhiroba.jp",
  idpHost: "account.bandainamcoid.com",
  idpDomain: "bandainamcoid.com",
  imgOrigin: "https://img.taiko-p.jp",
};

/** The one cookie that is the Hiroba session. Only a platform transport ever reads its value. */
export const SESSION_COOKIE_NAME = "_token_v2";

/** Where a sign-in starts. Opened with no session, it shows Hiroba's own sign-in button. */
export const loginPageUrl = (endpoints: HirobaEndpoints): string =>
  `${endpoints.hirobaOrigin}/login.php`;

export const myPageUrl = (endpoints: HirobaEndpoints): string =>
  `${endpoints.hirobaOrigin}/mypage_top.php`;

/** The ID host's origin. It is served on the same scheme as Hiroba: https, or http for the mock. */
export const idpOrigin = (endpoints: HirobaEndpoints): string =>
  `${new URL(endpoints.hirobaOrigin).protocol}//${endpoints.idpHost}`;

/** Development only: a local stand-in's endpoints. Both overrides or neither, as one alone would
 * leave the other on the real site; the picture host's is optional and needs both of them. */
export function endpointsFromOverrides(
  hirobaOrigin: string | undefined,
  idpHost: string | undefined,
  imgOrigin?: string,
): HirobaEndpoints {
  const origin = hirobaOrigin ?? "";
  const host = idpHost ?? "";
  const pictures = imgOrigin ?? "";
  if (origin === "" && host === "" && pictures === "") {
    return HIROBA_ENDPOINTS;
  }
  if (origin === "" || host === "") {
    throw new Error(
      "Set both development endpoint overrides, or neither, and the picture host's only with both.",
    );
  }
  return {
    hirobaOrigin: origin,
    idpHost: host,
    // The stand-in's ID domain is its ID host's name: its hops live on that host and under it.
    idpDomain: host.replace(/:\d+$/, ""),
    // No override, no picture host: a stand-in run can never reach the real one.
    imgOrigin: pictures === "" ? null : pictures,
  };
}
