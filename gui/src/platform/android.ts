import { err, ok, type Transport } from "@abth/core";
import { CapacitorCookies } from "@capacitor/core";
import {
  DefaultAndroidWebViewOptions,
  DefaultWebViewOptions,
  InAppBrowser,
} from "@capacitor/inappbrowser";

import {
  ANDROID_PICTURE_LIMITS,
  type CostumeHistoryStore,
  createMemoryPictureStore,
  createPictureReader,
  createRecentPreviews,
  createSessionWrites,
  endpointsFromOverrides,
  HIROBA_ENDPOINTS,
  type HirobaEndpoints,
  idpOrigin,
  keepHirobaEnded,
  loginPageUrl,
  offeredOf,
  type PictureSources,
  previewCostume,
  queuePort,
  readOwnProfile,
  sessionEnded,
  signInStep,
  viewOfPipelines,
} from "../hiroba-session";
import {
  createMemoryPipelineStore,
  createPipeline,
  createPipelineLog,
  EXTERNAL_READ_CONSUMERS,
  IO_READ_CONSUMERS,
} from "../pipelines";
import {
  type CostumeSet,
  checkedPort,
  type HirobaSessionPort,
  type SignInOutcome,
} from "../session-port";
import {
  CHINESE_NAMES_URL,
  catalogueUrlFor,
  chartOriginFor,
  createChartPictureReader,
  readChineseNames,
  readSongCatalogue,
} from "../song-catalogue";
import { feedUrlFor, readUpdateFeed } from "../updates";
import { createIndexedDbHistoryStore } from "./android-history-store";
import type { DatabaseFactory } from "./android-indexeddb";
import { CHART_PICTURE_DATABASE, createIndexedDbPictureStore } from "./android-picture-store";
import { createIndexedDbPipelineStores } from "./android-pipeline-store";
import { createAndroidTransport } from "./android-transport";

const endpoints: HirobaEndpoints = import.meta.env.DEV
  ? endpointsFromOverrides(
      import.meta.env.VITE_ABTH_DEV_HIROBA_ORIGIN,
      import.meta.env.VITE_ABTH_DEV_IDP_HOST,
      import.meta.env.VITE_ABTH_DEV_IMG_ORIGIN,
    )
  : HIROBA_ENDPOINTS;

const updateFeedUrl = feedUrlFor(
  Boolean(import.meta.env.DEV),
  import.meta.env.VITE_ABTH_DEV_UPDATE_FEED,
);

const songCatalogueUrl = catalogueUrlFor(
  Boolean(import.meta.env.DEV),
  import.meta.env.VITE_ABTH_DEV_SONG_CATALOGUE,
);

const chineseNamesUrl = catalogueUrlFor(
  Boolean(import.meta.env.DEV),
  import.meta.env.VITE_ABTH_DEV_CHINESE_NAMES,
  CHINESE_NAMES_URL,
);

const chartOrigin = chartOriginFor(
  Boolean(import.meta.env.DEV),
  import.meta.env.VITE_ABTH_DEV_CHART_ORIGIN,
);

export interface AndroidPortOptions {
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

/** Refuses every call, so the history is simply empty. */
const NO_HISTORY_STORE: CostumeHistoryStore = {
  load: () => Promise.reject(new Error("There is nowhere to keep a costume history")),
  save: () => Promise.reject(new Error("There is nowhere to keep a costume history")),
};

export interface SignedInFlag {
  get(): boolean;
  set(value: boolean): void;
}

const SIGNED_IN_KEY = "abth.signedIn";

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

/** The Android port. Its session is the WebView's cookie store, which this code cannot read. */
export async function createAndroidPort(options: AndroidPortOptions): Promise<HirobaSessionPort> {
  const transport = createAndroidTransport();
  const flag = options.signedInFlag ?? localStorageFlag;
  let signedIn = flag.get();
  const pipelineStore =
    options.indexedDb === undefined
      ? () => createMemoryPipelineStore()
      : createIndexedDbPipelineStores(options.indexedDb);
  const logs = {
    io: createPipelineLog({ store: pipelineStore("io") }),
    pictures: createPipelineLog({ store: pipelineStore("pictures") }),
    external: createPipelineLog({ store: pipelineStore("external") }),
  };
  // One transport for every site: a group sends through its own, made from it.
  const pipelines = {
    io: createPipeline({
      readConsumers: IO_READ_CONSUMERS,
      transport,
      ended: keepHirobaEnded(logs),
    }),
    external: createPipeline({
      readConsumers: EXTERNAL_READ_CONSUMERS,
      transport,
      ended: logs.external.add,
    }),
  };
  let offered: ReadonlySet<string> = new Set();
  let owner: string | null = null;
  let sources: PictureSources | null = null;
  const previews = createRecentPreviews((set, picture) => void writes.previewKept(set, picture));
  const servedPreview = (hiroba: Transport) =>
    previews.keeping(async (set: CostumeSet) => {
      if (!signedIn) {
        return err({ code: "preview=notSignedIn" });
      }
      return previewCostume(hiroba, endpoints, set);
    });
  const pictures = createPictureReader({
    endpoints,
    store:
      options.indexedDb === undefined
        ? createMemoryPictureStore()
        : createIndexedDbPictureStore(options.indexedDb),
    pipeline: pipelines.io,
    limits: ANDROID_PICTURE_LIMITS,
    state: () => ({ signedIn, offered, owner, sources }),
  });
  const chartPictures = createChartPictureReader({
    store:
      options.indexedDb === undefined
        ? createMemoryPictureStore()
        : createIndexedDbPictureStore(options.indexedDb, CHART_PICTURE_DATABASE),
    pipeline: pipelines.external,
    chartOrigin,
  });

  const forget = async () => {
    pipelines.io.stop();
    signedIn = false;
    flag.set(false);
    offered = new Set();
    owner = null;
    sources = null;
    pictures.forget();
    previews.clear();
    await CapacitorCookies.clearAllCookies();
  };

  const { indexedDb } = options;
  const writes = createSessionWrites({
    endpoints,
    platform: "android",
    now: options.now ?? (() => new Date()),
    historyStore:
      indexedDb === undefined ? NO_HISTORY_STORE : createIndexedDbHistoryStore(indexedDb),
    recentPreview: previews.pictureOf,
    signedIn: () => signedIn,
    endSession: forget,
    owner: () => owner,
    costumeChanged: (worn) => {
      pictures.costumeChanged();
      previews.wear(worn);
    },
  });

  const port = queuePort(pipelines, {
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
              // Isolated (the default) means a cookie store the app can neither use nor clear.
              isIsolated: false,
              // Back would step off the card-select page, which ends the card session.
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
      // clearCookies({url}) removes host cookies, not Domain cookies, so this is best effort.
      await CapacitorCookies.clearCookies({ url: `${idpOrigin(endpoints)}/` });
      await saveCookieStore();
      signedIn = true;
      flag.set(true);
      return { kind: "signedIn" } satisfies SignInOutcome;
    },

    async cancelSignIn() {
      await InAppBrowser.close().catch(() => undefined);
    },

    readProfile: async (hiroba, options) => {
      if (!signedIn) {
        return err({ kind: "notSignedIn" });
      }
      if (options?.renewsPortrait !== false) {
        pictures.myPageAsked();
      }
      const read = await readOwnProfile(hiroba, endpoints);
      if (!read.ok && sessionEnded(read.error)) {
        await forget();
      } else {
        // Hiroba may renew the session on a read; keep the new one.
        await saveCookieStore();
      }
      if (!read.ok) {
        return read;
      }
      owner = read.value.taikoNo;
      sources = read.value.pictures;
      await pictures.confirm(read.value.taikoNo);
      return ok(read.value.view);
    },

    async signOut() {
      await forget();
    },

    openCostumeEditor: flushed(async (hiroba) => {
      const read = await writes.openCostumeEditor(hiroba);
      if (read.ok) {
        previews.wear(read.value.state);
        offered = offeredOf(read.value);
      }
      return read;
    }),

    openTitleEditor: flushed(writes.openTitleEditor),

    // Its failure forgets nothing: the next page read says whether the session is over.
    previewCostume: (hiroba, set) => servedPreview(hiroba)(set),

    readPicture: (want) => pictures.read(want),

    changeCostume: flushed(writes.changeCostume),

    changeTitle: flushed(writes.changeTitle),

    changeName: flushed(writes.changeName),

    // Asks Hiroba nothing, so it skips the pipelines.
    costumeHistory: writes.costumeHistory,

    readUpdateFeed: (site) => readUpdateFeed(site, updateFeedUrl),

    openFavorites: flushed(writes.openFavorites),

    changeFolder: flushed(writes.changeFolder),

    changeFavoriteSong: flushed(writes.changeFavoriteSong),

    readSongPicker: flushed(writes.readSongPicker),

    readSongCatalogue: (site, since) => readSongCatalogue(site, songCatalogueUrl, since),

    readChineseNames: (site) => readChineseNames(site, chineseNamesUrl),

    readChartPicture: chartPictures,

    readPipelines: async (history) => viewOfPipelines(pipelines, logs, history),
  });

  return checkedPort(port);
}

/** Runs, then saves the cookie store however it ended: Hiroba may have renewed the session. */
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

// The WebView saves cookies on its own schedule; a swiped-away app could lose a fresh session.
// Capacitor has no flush; any cookie write ends in one, so delete a cookie that does not exist.
async function saveCookieStore(): Promise<void> {
  await CapacitorCookies.deleteCookie({ key: "abth-save" });
}
