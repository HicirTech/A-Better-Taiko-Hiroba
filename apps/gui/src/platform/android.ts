import { err, ok } from "@abth/core";
import { CapacitorCookies } from "@capacitor/core";
import {
  DefaultAndroidWebViewOptions,
  DefaultWebViewOptions,
  InAppBrowser,
} from "@capacitor/inappbrowser";

import {
  ANDROID_PICTURE_LIMITS,
  createHirobaQueue,
  createMemoryPictureStore,
  createPictureReader,
  createSessionWrites,
  endpointsFromOverrides,
  HIROBA_ENDPOINTS,
  type HirobaEndpoints,
  idpOrigin,
  loginPageUrl,
  offeredOf,
  type PictureSources,
  previewCostume,
  queuePort,
  readOwnProfile,
  sessionEnded,
  signInStep,
  type UndoStore,
} from "../hiroba-session";
import {
  checkedPort,
  type CostumeSet,
  type HirobaSessionPort,
  type SignInOutcome,
} from "../session-port";
import type { DatabaseFactory } from "./android-indexeddb";
import { createIndexedDbPictureStore } from "./android-picture-store";
import { createAndroidTransport } from "./android-transport";
import { createIndexedDbUndoStore } from "./android-undo-store";

// Development only (the Vite dev server behind live reload): a local stand-in for Hiroba and the ID
// host. A production build replaces import.meta.env.DEV with false and drops this branch; setting
// only one of the two stops the app rather than half-reaching the real sites. The picture host's
// is optional: without it, a stand-in run asks no picture host anything.
const endpoints: HirobaEndpoints = import.meta.env.DEV
  ? endpointsFromOverrides(
      import.meta.env.VITE_ABTH_DEV_HIROBA_ORIGIN,
      import.meta.env.VITE_ABTH_DEV_IDP_HOST,
      import.meta.env.VITE_ABTH_DEV_IMG_ORIGIN,
    )
  : HIROBA_ENDPOINTS;

export interface AndroidPortOptions {
  /**
   * The in-app browser's close button, from the catalog: asked for each time the browser opens,
   * so it is in the language picked since.
   */
  readonly closeLabel: () => string;
  /** Where "a sign-in finished here" is remembered across launches. The page's localStorage. */
  readonly signedInFlag?: SignedInFlag;
  /**
   * Where Hiroba's pictures and the undo records are kept across launches: the page's IndexedDB.
   * Without one, the pictures are kept in memory for the run, and a write is not sent: an undo
   * record held in memory would not survive an app killed in the middle of the write.
   */
  readonly indexedDb?: DatabaseFactory;
  /** The clock a write checks Hiroba's daily break against. */
  readonly now?: () => Date;
}

/** Where an undo record is kept when there is nowhere: every call is refused, so no write is sent. */
const NO_UNDO_STORE: UndoStore = {
  load: () => Promise.reject(new Error("There is nowhere to keep an undo record")),
  save: () => Promise.reject(new Error("There is nowhere to keep an undo record")),
};

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
 * queue the desktop uses, which `queuePort` puts each verb in: a picture never goes out beside a
 * read, and two reads never overlap. A write is one turn of it, all its requests: no read and no
 * picture goes out between them. The writes are the desktop's own verbs (`createSessionWrites`)
 * over Android's transport and an undo store in IndexedDB, with the cookie store written to disk
 * after each. Nothing here is an IPC boundary, so the port is wrapped to check every call's
 * arguments, as the desktop's main process does for the window.
 *
 * Hiroba's pictures come through the same reader as on the desktop, kept in the page's IndexedDB
 * across launches and sign-outs, each fetched once. What that reader needs to know stays in this
 * closure and goes with the session: the items the last editor read offered, the only ones whose
 * thumbnail may be asked for, and, from the last read of my page, whose page it was and where its
 * pictures are. None of it reaches the window: the view the window is given is the one the desktop
 * gives.
 */
export async function createAndroidPort(options: AndroidPortOptions): Promise<HirobaSessionPort> {
  const transport = createAndroidTransport();
  const flag = options.signedInFlag ?? localStorageFlag;
  let signedIn = flag.get();
  const queue = createHirobaQueue();
  let offered: ReadonlySet<string> = new Set();
  let owner: string | null = null;
  let sources: PictureSources | null = null;
  const pictures = createPictureReader({
    transport,
    endpoints,
    store:
      options.indexedDb === undefined
        ? createMemoryPictureStore()
        : createIndexedDbPictureStore(options.indexedDb),
    queue,
    limits: ANDROID_PICTURE_LIMITS,
    state: () => ({ signedIn, offered, owner, sources }),
  });

  const forget = async () => {
    signedIn = false;
    flag.set(false);
    offered = new Set();
    owner = null;
    sources = null;
    pictures.forget();
    await CapacitorCookies.clearAllCookies();
  };

  const { indexedDb } = options;
  const writes = createSessionWrites({
    transport,
    endpoints,
    platform: "android",
    now: options.now ?? (() => new Date()),
    undoStore: indexedDb === undefined ? NO_UNDO_STORE : createIndexedDbUndoStore(indexedDb),
    signedIn: () => signedIn,
    endSession: forget,
    owner: () => owner,
    // The My Don kept shows the costume before: it is fetched anew when next shown.
    costumeChanged: () => pictures.costumeChanged(),
  });

  const port = queuePort(queue, {
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
            closeButtonText: options.closeLabel(),
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

    readProfile: async (options) => {
      if (!signedIn) {
        return err({ kind: "notSignedIn" });
      }
      // Every read but the session's first is the user's Read again: the portrait is renewed. One
      // the window makes on its own says it is not.
      if (options?.renewsPortrait !== false) {
        pictures.myPageAsked();
      }
      const read = await readOwnProfile(transport, endpoints);
      if (!read.ok && sessionEnded(read.error)) {
        await forget();
      } else {
        // A read can carry a session Hiroba renewed on the way; keep that one, not the old.
        await saveCookieStore();
      }
      if (!read.ok) {
        return read;
      }
      owner = read.value.taikoNo;
      sources = read.value.pictures;
      // The session held: the plates fetched before this read are the player's own.
      await pictures.confirm(read.value.taikoNo);
      // The title and the name it shows settle a write whose end was not known, and date a stale
      // record.
      const { view } = read.value;
      await writes.profileRead({
        taikoNo: read.value.taikoNo,
        title: view.title,
        nickname: view.nickname,
      });
      return ok(read.value.view);
    },

    async signOut() {
      await forget();
    },

    // The items it offers are the only ones whose thumbnail the window may ask for next.
    openCostumeEditor: flushed(async () => {
      const read = await writes.openCostumeEditor();
      if (read.ok) {
        offered = offeredOf(read.value);
      }
      return read;
    }),

    openTitleEditor: flushed(writes.openTitleEditor),

    // A read that changes nothing, allowed here as on the desktop. Its failure forgets nothing: the
    // next read of a page says whether the session is over.
    previewCostume: async (set: CostumeSet) => {
      if (!signedIn) {
        return err({ code: "preview=notSignedIn" });
      }
      return previewCostume(transport, endpoints, set);
    },

    // A read like the preview, refused unsent while signed out; its fetch waits in the queue.
    readPicture: (want) => pictures.read(want),

    changeCostume: flushed(writes.changeCostume),

    changeTitle: flushed(writes.changeTitle),

    changeName: flushed(writes.changeName),

    // Reads the undo store alone and asks Hiroba nothing: not in the queue.
    pendingUndo: writes.pendingUndo,

    // The port types an undo's outcome by the kind asked; `flushed` hands the one it is given on.
    undo: flushed(writes.undo) as HirobaSessionPort["undo"],
  });

  return checkedPort(port);
}

/**
 * `run`, then the WebView's cookie store written to disk, however `run` ended: Hiroba may have
 * renewed the session on the way, a failed write included, and it must be on disk before the app
 * can be swiped away.
 */
function flushed<A extends unknown[], R>(
  run: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args) => {
    try {
      return await run(...args);
    } finally {
      await saveCookieStore();
    }
  };
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
