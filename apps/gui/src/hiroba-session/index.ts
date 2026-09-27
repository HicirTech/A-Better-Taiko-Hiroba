/**
 * The Hiroba session as the app sees it, shared by both shells: where a sign-in stands, the read,
 * and the writes, with the gate that says which a run may send. Nothing here holds or sees the
 * session cookie.
 */
export {
  endpointsFromOverrides,
  HIROBA_ENDPOINTS,
  idpOrigin,
  loginPageUrl,
  myPageUrl,
  SESSION_COOKIE_NAME,
} from "./endpoints";
export { type CostumeWriteOptions, changeCostume } from "./change-costume";
export { openCostumeEditor } from "./open-costume-editor";
export { readProfile } from "./read-profile";
export { signInStep } from "./sign-in-step";
export type { HirobaEndpoints, SignInStep } from "./types";
export {
  enabledWrites,
  unverifiedWritesOpen,
  VERIFIED_WRITES,
  WRITE_KINDS,
  type WriteGateInput,
} from "./verified-writes";
