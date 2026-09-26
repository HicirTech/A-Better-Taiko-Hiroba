/**
 * The Hiroba session as the app sees it, shared by both shells: where a sign-in stands. Nothing
 * here holds or sees the session cookie.
 */
export { HIROBA_ENDPOINTS, loginPageUrl, myPageUrl, SESSION_COOKIE_NAME } from "./endpoints";
export { signInStep } from "./sign-in-step";
export type { HirobaEndpoints, SignInStep } from "./types";
