import { join } from "node:path";
import { err, ok, type Transport } from "@abth/core";
import {
  app,
  BrowserWindow,
  type IpcMainInvokeEvent,
  ipcMain,
  Menu,
  screen,
  session,
  shell,
} from "electron";

import {
  createPictureReader,
  createRecentPlaysReader,
  createRecentPreviews,
  createScoresReader,
  createSessionWrites,
  DESKTOP_PICTURE_LIMITS,
  keepHirobaEnded,
  offeredOf,
  type PictureSources,
  previewCostume,
  queuePort,
  readOwnProfile,
  sessionEnded,
  viewOfPipelines,
} from "../src/hiroba-session";
import {
  createPipeline,
  createPipelineLog,
  EXTERNAL_READ_CONSUMERS,
  HISTORY_READ_CONSUMERS,
  IO_READ_CONSUMERS,
  SCORE_READ_CONSUMERS,
} from "../src/pipelines";
import {
  BRIDGE_CHANNELS,
  type CostumeSet,
  type HirobaSessionPort,
  PORT_ARGUMENTS,
  type SignInOutcome,
} from "../src/session-port";
import {
  createChartPictureReader,
  readChineseNames,
  readSongCatalogue,
} from "../src/song-catalogue";
import { openableUrlOf, readUpdateFeed } from "../src/updates";
import { APP_ORIGIN, registerAppScheme, serveWebBundle } from "./app-protocol";
import { createCostumeHistoryStore } from "./costume-history-store";
import { type DesktopEnvironment, desktopEnvironment } from "./desktop-environment";
import { createHirobaTransport } from "./hiroba-transport";
import { createDiskPictureStore } from "./picture-disk-store";
import { createPipelineHistoryStore } from "./pipeline-history-store";
import { createRecentPlaysStore } from "./recent-plays-store";
import { saveReads } from "./save-reads";
import { createScoresStore } from "./scores-store";
import { createSessionStore, type SessionStore } from "./session-store";
import { openSignInWindow, type SignInAttempt } from "./sign-in-window";
import { createUpdateFeedTransport } from "./update-feed-transport";

const environment = startedWith();
const { devServerUrl, endpoints } = environment;

function startedWith(): DesktopEnvironment {
  try {
    return desktopEnvironment(app.isPackaged, process.env);
  } catch (error) {
    // Not thrown: an uncaught error in the main process opens a dialog and waits.
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Hiroba answers a client that does not look like a full browser with a data-less page, so the
// default string, which names Electron and the app, is replaced with Chrome's reduced form.
const chromeMajor = process.versions.chrome.split(".")[0];
const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Safari/537.36`;
app.userAgentFallback = userAgent;

// The window opens as tall as the Overview at its width, with no scrollbar; a screen with less
// room gives what its work area holds, less the title bar and the borders.
const WINDOW_CONTENT_PX = { width: 946, height: 736 } as const;
const WINDOW_FRAME_PX = 40;

// Dev profiles stay out of the real %APPDATA%, where the installed app keeps its session.
if (environment.userData !== undefined) {
  app.setPath("userData", environment.userData);
}

app.enableSandbox();
registerAppScheme();

// The session cookie is held in this process: never logged, never sent to a renderer.
let sessionCookie: string | null = null;
let sessionStore: SessionStore | null = null;
// Held in this process and forgotten with the session: whose my page was last read (the taiko
// number), where its pictures are, and which costume items the editor offered.
let owner: string | null = null;
let sources: PictureSources | null = null;
let offered: ReadonlySet<string> = new Set();
const setSession = (value: string | null) => {
  sessionCookie = value;
  sessionStore?.save(value);
  if (value === null) {
    pipelines.io.stop();
    pipelines.history.stop();
    pipelines.scores.stop();
    owner = null;
    sources = null;
    offered = new Set();
    pictures.forget();
    previews.clear();
  }
};
let signInAttempt: SignInAttempt | null = null;
const transport = createHirobaTransport({
  session: {
    get: () => sessionCookie,
    // A token Hiroba rotates, or ends, on a redirect hop is kept on disk as well.
    set: setSession,
  },
  userAgent,
  hirobaOrigin: endpoints.hirobaOrigin,
});
const readTransport =
  process.env.ABTH_DEBUG_SAVE_READS === "1"
    ? saveReads(transport, join(app.getPath("userData"), "debug"))
    : transport;

const feedTransport = createUpdateFeedTransport({
  userAgent,
  hirobaOrigin: endpoints.hirobaOrigin,
});

const pipelineStore = (name: string) =>
  createPipelineHistoryStore(join(app.getPath("userData"), "pipelines", `${name}.json`));
const logs = {
  io: createPipelineLog({ store: pipelineStore("io") }),
  pictures: createPipelineLog({ store: pipelineStore("pictures") }),
  history: createPipelineLog({ store: pipelineStore("history") }),
  scores: createPipelineLog({ store: pipelineStore("scores") }),
  external: createPipelineLog({ store: pipelineStore("external") }),
};
// Hiroba is asked through `io`, so no read lands inside a write, but for its play history and
// score details: those pages carry no form token. A group sends through its own transport.
const pipelines = {
  io: createPipeline({
    readConsumers: IO_READ_CONSUMERS,
    transport: readTransport,
    ended: keepHirobaEnded(logs),
  }),
  history: createPipeline({
    readConsumers: HISTORY_READ_CONSUMERS,
    transport: readTransport,
    ended: logs.history.add,
  }),
  scores: createPipeline({
    readConsumers: SCORE_READ_CONSUMERS,
    transport: readTransport,
    ended: logs.scores.add,
  }),
  external: createPipeline({
    readConsumers: EXTERNAL_READ_CONSUMERS,
    transport: feedTransport,
    ended: logs.external.add,
  }),
};

// A kept picture answers at once, even while a write runs; only a fetch waits in the pipeline.
const pictures = createPictureReader({
  endpoints,
  store: createDiskPictureStore(join(app.getPath("userData"), "pictures")),
  pipeline: pipelines.io,
  limits: DESKTOP_PICTURE_LIMITS,
  state: () => ({ signedIn: sessionCookie !== null, offered, owner, sources }),
});
// Asked of the wiki's hosts, not Hiroba: the external pipeline's transport holds no session.
const chartPictures = createChartPictureReader({
  store: createDiskPictureStore(join(app.getPath("userData"), "charts")),
  pipeline: pipelines.external,
  chartOrigin: environment.chartOrigin,
});
// The writes come up with the window: until then a kept picture fills no history.
let previewKept: (set: CostumeSet, picture: string) => void = () => undefined;
const previews = createRecentPreviews((set, picture) => previewKept(set, picture));
const servedPreview = (hiroba: Transport) =>
  previews.keeping(async (set: CostumeSet) => {
    if (sessionCookie === null) {
      return err({ code: "preview=notSignedIn" });
    }
    return previewCostume(hiroba, endpoints, set);
  });
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.whenReady().then(async () => {
  if (app.isPackaged) {
    Menu.setApplicationMenu(null);
  }
  serveWebBundle();
  sessionStore = createSessionStore(join(app.getPath("userData"), "session.json"));
  sessionCookie = sessionStore.load();
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );

  const room = screen.getPrimaryDisplay().workAreaSize.height - WINDOW_FRAME_PX;
  const mainWindow = new BrowserWindow({
    useContentSize: true,
    width: WINDOW_CONTENT_PX.width,
    height: Math.min(WINDOW_CONTENT_PX.height, room),
    // A packaged app has no menu; a development one keeps its shortcuts, its bar shown by Alt.
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(app.getAppPath(), "out", "electron", "preload.cjs"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  // No window opens; a link to the repository's page or to its releases opens in the system's
  // browser, and no other does.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const openable = openableUrlOf(url);
    if (openable !== null) {
      // A browser that will not open must not become an unhandled rejection in this process.
      shell.openExternal(openable).catch(() => undefined);
    }
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());

  const writes = createSessionWrites({
    endpoints,
    platform: "desktop",
    now: environment.now,
    historyStore: createCostumeHistoryStore(join(app.getPath("userData"), "costume-history.json")),
    recentPreview: previews.pictureOf,
    signedIn: () => sessionCookie !== null,
    endSession: () => setSession(null),
    owner: () => owner,
    costumeChanged: (worn) => {
      pictures.costumeChanged();
      previews.wear(worn);
    },
  });
  previewKept = (set, picture) => void writes.previewKept(set, picture);
  const recentPlays = createRecentPlaysReader({
    endpoints,
    pipeline: pipelines.history,
    store: createRecentPlaysStore(join(app.getPath("userData"), "recent-plays.json")),
    owner: () => owner,
    endSession: () => setSession(null),
    walked: (taikoNo, reading) => scores.noteWalk(taikoNo, reading),
  });
  const scores = createScoresReader({
    endpoints,
    io: pipelines.io,
    pipeline: pipelines.scores,
    store: createScoresStore(join(app.getPath("userData"), "scores.json")),
    owner: () => owner,
    endSession: () => setSession(null),
    walk: recentPlays.readRecentPlays,
    walkProgress: recentPlays.recentPlaysProgress,
    recentPlays: recentPlays.recentPlays,
  });

  const port = queuePort(pipelines, {
    async isSignedIn() {
      return sessionCookie !== null;
    },
    async signIn(): Promise<SignInOutcome> {
      signInAttempt?.cancel();
      setSession(null);
      const attempt = openSignInWindow(mainWindow, endpoints, userAgent);
      signInAttempt = attempt;
      const result = await attempt.result;
      if (signInAttempt === attempt) {
        signInAttempt = null;
      }
      if (result.kind !== "captured") {
        return result;
      }
      setSession(result.cookie);
      return { kind: "signedIn" };
    },
    async cancelSignIn() {
      signInAttempt?.cancel();
    },
    readProfile: async (hiroba, options) => {
      if (sessionCookie === null) {
        return err({ kind: "notSignedIn" });
      }
      if (options?.renewsPortrait !== false) {
        pictures.myPageAsked();
      }
      const read = await readOwnProfile(hiroba, endpoints);
      if (!read.ok) {
        if (sessionEnded(read.error)) {
          setSession(null);
        }
        return read;
      }
      owner = read.value.taikoNo;
      sources = read.value.pictures;
      await pictures.confirm(read.value.taikoNo);
      return ok(read.value.view);
    },
    async signOut() {
      setSession(null);
    },
    openCostumeEditor: async (hiroba) => {
      const read = await writes.openCostumeEditor(hiroba);
      if (read.ok) {
        previews.wear(read.value.state);
        offered = offeredOf(read.value);
      }
      return read;
    },
    openTitleEditor: writes.openTitleEditor,
    // Its failure leaves the session be: the next page read says whether it is over.
    previewCostume: (hiroba, set) => servedPreview(hiroba)(set),
    readPicture: (want) => pictures.read(want),
    changeCostume: writes.changeCostume,
    changeTitle: writes.changeTitle,
    changeName: writes.changeName,
    costumeHistory: writes.costumeHistory,
    readUpdateFeed: (site) => readUpdateFeed(site, environment.updateFeedUrl),
    openFavorites: writes.openFavorites,
    changeFolder: writes.changeFolder,
    changeFavoriteSong: writes.changeFavoriteSong,
    readSongPicker: writes.readSongPicker,
    refreshHiroba: writes.refreshHiroba,
    recentPlays: recentPlays.recentPlays,
    readRecentPlays: recentPlays.readRecentPlays,
    recentPlaysProgress: recentPlays.recentPlaysProgress,
    scores: scores.scores,
    readScores: scores.readScores,
    readSongScores: scores.readSongScores,
    scoresProgress: scores.scoresProgress,
    readSongCatalogue: (site, since) =>
      readSongCatalogue(site, environment.songCatalogueUrl, since),
    readChineseNames: (site) => readChineseNames(site, environment.chineseNamesUrl),
    readChartPicture: chartPictures,
    readPipelines: async (history) => viewOfPipelines(pipelines, logs, history),
  });

  // Scheme and host, compared by hand: URL.origin is "null" for a custom scheme such as app:.
  const originOf = (raw: string) => {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`;
  };
  const expectedOrigin = originOf(devServerUrl ?? APP_ORIGIN);
  const trusted = (event: IpcMainInvokeEvent) => {
    const url = event.senderFrame?.url;
    return url !== undefined && originOf(url) === expectedOrigin;
  };
  for (const [method, channel] of Object.entries(BRIDGE_CHANNELS)) {
    const verb = method as keyof HirobaSessionPort;
    ipcMain.handle(channel, (event, ...args: unknown[]) => {
      if (!trusted(event)) {
        throw new Error(`Refused ${channel} from an untrusted frame`);
      }
      // The arguments are the renderer's, so they are checked before the verb sees them.
      if (!PORT_ARGUMENTS[verb](args)) {
        throw new Error(`Refused ${channel}: arguments it does not take`);
      }
      return (port[verb] as (...values: unknown[]) => Promise<unknown>)(...args);
    });
  }

  await mainWindow.loadURL(devServerUrl ?? `${APP_ORIGIN}/`);
});

app.on("window-all-closed", () => app.quit());
