import { CAPACITOR_PICTURE_LIMITS, createHirobaServices, queuePort } from "../hiroba-session";
import { checkedPort, type HirobaSessionPort } from "../shared/session-port";
import type { DatabaseFactory } from "./capacitor-indexeddb";
import {
  clearCookieStore,
  closeSignInBrowser,
  localStorageFlag,
  type SignedInFlag,
  saveCookieStore,
  signInInBrowser,
} from "./capacitor-session";
import { CAPACITOR_ENDPOINTS, CAPACITOR_SITES } from "./capacitor-sites";
import { capacitorStores } from "./capacitor-stores";
import { createCapacitorTransport } from "./capacitor-transport";
import { safariUserAgent } from "./safari-user-agent";
import type { MobileOs } from "./system-os";

export interface CapacitorPortOptions {
  /** Android unless said otherwise. */
  readonly os?: MobileOs;
  /** Asked each time the browser opens, so it follows a language picked since. */
  readonly closeLabel: () => string;
  /** Remembers a finished sign-in: CapacitorCookies.getCookies cannot see the session cookie. */
  readonly signedInFlag?: SignedInFlag;
  /** Keeps pictures and costume histories across launches. Without it, pictures stay in memory
   * and the history is empty. */
  readonly indexedDb?: DatabaseFactory;
  /** The clock a write checks Hiroba's daily break against. */
  readonly now?: () => Date;
}

/** Capacitor's port. Its session is the native cookie store, which this code cannot read. */
export async function createCapacitorPort(
  options: CapacitorPortOptions,
): Promise<HirobaSessionPort> {
  const os = options.os ?? "android";
  const userAgent = os === "ios" ? safariUserAgent(navigator.userAgent) : navigator.userAgent;
  const transport = createCapacitorTransport(userAgent, os);
  const flag = options.signedInFlag ?? localStorageFlag;
  let signedIn = flag.get();
  const services = createHirobaServices({
    endpoints: CAPACITOR_ENDPOINTS,
    sites: CAPACITOR_SITES,
    platform: os,
    now: options.now ?? (() => new Date()),
    hiroba: transport,
    external: transport,
    pictureLimits: CAPACITOR_PICTURE_LIMITS,
    stores: capacitorStores(options.indexedDb),
    signedIn: () => signedIn,
    endSession: async () => {
      signedIn = false;
      flag.set(false);
      await clearCookieStore();
    },
    // Hiroba may renew the session on a read or a write; keep the new one.
    afterHiroba: saveCookieStore,
  });

  const port = queuePort(services.pipelines, {
    ...services.verbs,
    async isSignedIn() {
      return signedIn;
    },
    async signIn() {
      const outcome = await signInInBrowser({
        endpoints: CAPACITOR_ENDPOINTS,
        os,
        userAgent,
        closeLabel: options.closeLabel,
        forget: services.forget,
      });
      if (outcome.kind === "signedIn") {
        signedIn = true;
        flag.set(true);
      }
      return outcome;
    },
    cancelSignIn: closeSignInBrowser,
  });
  return checkedPort(port);
}
