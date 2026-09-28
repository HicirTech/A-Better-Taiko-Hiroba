import { err } from "@abth/core";
import { CapacitorCookies } from "@capacitor/core";
import {
  DefaultAndroidWebViewOptions,
  DefaultWebViewOptions,
  InAppBrowser,
} from "@capacitor/inappbrowser";

import {
  createHirobaQueue,
  endpointsFromOverrides,
  HIROBA_ENDPOINTS,
  type HirobaEndpoints,
  idpOrigin,
  loginPageUrl,
  openCostumeEditor,
  previewCostume,
  readProfile,
  signInStep,
} from "../hiroba-session";
import type { CostumeSet, HirobaSessionPort, ReadFailure, SignInOutcome } from "../session-port";
import { createAndroidTransport } from "./android-transport";

// Development only (the Vite dev server behind live reload): a local stand-in for Hiroba and the ID
// host. A production build replaces import.meta.env.DEV with false and drops this branch; setting
// only one of the two stops the app rather than half-reaching the real sites.
const endpoints: HirobaEndpoints = import.meta.env.DEV
  ? endpointsFromOverrides(
      import.meta.env.VITE_ABTH_DEV_HIROBA_ORIGIN,
      import.meta.env.VITE_ABTH_DEV_IDP_HOST,
    )
  : HIROBA_ENDPOINTS;

export interface AndroidPortOptions {
  /** The in-app browser's close button, from the catalog. */
  readonly closeLabel: string;
  /** Where "a sign-in finished here" is remembered across launches. The page's localStorage. */
  readonly signedInFlag?: SignedInFlag;
}

/** One remembered yes or no. */
export interface SignedInFlag {
  get(): boolean;
  set(value: boolean): void;
}

const SIGNED_IN_KEY = "abth.signedIn";

/** The app page's localStorage. Its origin is the app's own, so it survives launches. */
const localStorageFlag: SignedInFlag = {
  get: () => {
    try {
      return globalThis.localStorage?.getItem(SIGNED_IN_KEY) === "1";
    } catch {
      return false;
    }
  },
  set: (value) => {
    try {
      if (value) {
        globalThis.localStorage?.setItem(SIGNED_IN_KEY, "1");
      } else {
        globalThis.localStorage?.removeItem(SIGNED_IN_KEY);
      }
    } catch {
      // Storage refused: the next launch asks for a sign-in, which is safe.
    }
  },
};

/**
 * The Android platform layer. The session lives only in the WebView's cookie store: the in-app
 * browser shares it (isIsolated: false), and Capacitor's HTTP client sends it. This code never
 * sees the cookie, and cannot even ask whether it is there: CapacitorCookies.getCookies ignores the
 * URL it is given and answers with the app page's own document.cookie (seen in Capacitor 8.5's
 * source, and on the tablet on 2026-09-27, where every relaunch read as signed out).
 *
 * So whether a sign-in finished here is remembered separately, in `signedInFlag`, and the first
 * read settles whether the session is still good: a gone session reads as loggedOut and clears the
 * flag. The store keeps its cookies across launches, so a user stays signed in until they sign out
 * or Hiroba ends the session (the user's call, 2026-09-27). It is wiped when a sign-in starts or
 * is abandoned, at sign-out and when the session is found gone. After a sign-in,
 * the ID host's own cookies are cleared as far as the platform allows: clearCookies({url}) removes
 * host cookies, not Domain cookies, which is also why the session itself is only ever cleared with
 * clearAllCookies.
 *
 * Every verb that asks Hiroba something runs one at a time, in the order asked, through the same
 * queue the desktop uses: a picture never goes out beside a read, and two reads never overlap.
 */
export async function createAndroidPort(options: AndroidPortOptions): Promise<HirobaSessionPort> {
  const transport = createAndroidTransport();
  const flag = options.signedInFlag ?? localStorageFlag;
  let signedIn = flag.get();
  const { oneAtATime } = createHirobaQueue();

  const forget = async () => {
    signedIn = false;
    flag.set(false);
    await CapacitorCookies.clearAllCookies();
  };

  return {
    async isSignedIn() {
      return signedIn;
    },

    async signIn() {
      await forget();
      await InAppBrowser.removeAllListeners();
      let landed = false;
      let browserClosed: () => void = () => undefined;
      const closed = new Promise<void>((resolve) => {
        browserClosed = resolve;
      });
      await InAppBrowser.addListener("browserPageNavigationCompleted", ({ url }) => {
        if (!landed && signInStep(url, endpoints) === "landed") {
          landed = true;
          void InAppBrowser.close();
        }
      });
      await InAppBrowser.addListener("browserClosed", () => browserClosed());
      try {
        await InAppBrowser.openInWebView({
          url: loginPageUrl(endpoints),
          options: {
            ...DefaultWebViewOptions,
            showURL: true,
            showNavigationButtons: false,
            closeButtonText: options.closeLabel,
            android: {
              ...DefaultAndroidWebViewOptions,
              // Default true since 4.0.0: an isolated view keeps its own cookie store, which the
              // app can neither use nor clear.
              isIsolated: false,
              // Default true walks back through the sign-in's history instead of closing, and
              // stepping back off the card-select page ends the card session.
              hardwareBack: false,
            },
          },
        });
      } catch {
        await InAppBrowser.removeAllListeners();
        await forget();
        return { kind: "unavailable" } satisfies SignInOutcome;
      }
      await closed;
      await InAppBrowser.removeAllListeners();
      if (!landed) {
        await forget();
        return { kind: "cancelled" } satisfies SignInOutcome;
      }
      // Whether a session really exists is settled by the first read, not here: the cookie's value
      // is out of reach by design.
      await CapacitorCookies.clearCookies({ url: `${idpOrigin(endpoints)}/` });
      await saveCookieStore();
      signedIn = true;
      flag.set(true);
      return { kind: "signedIn" } satisfies SignInOutcome;
    },

    async cancelSignIn() {
      await InAppBrowser.close().catch(() => undefined);
    },

    readProfile: oneAtATime(async () => {
      if (!signedIn) {
        return err({ kind: "notSignedIn" });
      }
      const read = await readProfile(transport, endpoints);
      if (!read.ok && sessionEnded(read.error)) {
        await forget();
      } else {
        // A read can carry a session Hiroba renewed on the way; keep that one, not the old.
        await saveCookieStore();
      }
      return read;
    }),

    signOut: forget,

    // Writes are the desktop's alone for now (the user's call, 2026-09-27): Android enables none,
    // sends none, and its transport refuses a post outright.
    async enabledWrites() {
      return [];
    },

    openCostumeEditor: oneAtATime(async () => {
      if (!signedIn) {
        return err({ kind: "notSignedIn" });
      }
      const read = await openCostumeEditor(transport, endpoints);
      if (!read.ok && sessionEnded(read.error)) {
        await forget();
      } else {
        await saveCookieStore();
      }
      return read;
    }),

    // A read that changes nothing, allowed here as on the desktop. Its failure forgets nothing: the
    // next read of a page says whether the session is over.
    previewCostume: oneAtATime(async (set: CostumeSet) => {
      if (!signedIn) {
        return err({ code: "preview=notSignedIn" });
      }
      return previewCostume(transport, endpoints, set);
    }),

    async changeCostume() {
      return { kind: "notEnabled" };
    },

    async pendingUndo() {
      return [];
    },

    async undo() {
      return { kind: "notEnabled" };
    },
  };
}

/** A read that found the login page, or a card still to choose: the session is over. */
function sessionEnded(failure: ReadFailure): boolean {
  return failure.kind === "loggedOut" || failure.kind === "cardSelectUnfinished";
}

/**
 * Writes the WebView's cookie store to disk now. Left alone it saves on its own schedule, so an app
 * swiped away soon after a sign-in could come back without the session, and a user must never be
 * asked to sign in again for that. Capacitor has no flush call, but every cookie write it makes ends
 * in one: deleting a cookie that does not exist, on the app's own origin (no url given), is a write
 * with no other effect.
 */
async function saveCookieStore(): Promise<void> {
  await CapacitorCookies.deleteCookie({ key: "abth-save" });
}
