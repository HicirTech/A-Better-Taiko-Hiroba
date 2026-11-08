import { join } from "node:path";
import { createTranslator, detectLocale } from "@abth/i18n";
import {
  app,
  BrowserWindow,
  dialog,
  type IpcMainInvokeEvent,
  ipcMain,
  Menu,
  screen,
  session,
  shell,
} from "electron";

import { createHirobaServices, DESKTOP_PICTURE_LIMITS, queuePort } from "../src/hiroba-session";
import { PAGE_GONE_FRAGMENT, WINDOW_CONTENT_PX } from "../src/platform/desktop-window";
import { crashCodeOf } from "../src/shared/crash-code";
import {
  BRIDGE_CHANNELS,
  type HirobaSessionPort,
  PORT_ARGUMENTS,
  type SignInOutcome,
} from "../src/shared/session-port";
import { openableUrlOf } from "../src/shared/updates";
import { APP_ORIGIN, registerAppScheme, serveWebBundle } from "./app-protocol";
import { DATA_FOLDER } from "./data-folder";
import { type DesktopEnvironment, desktopEnvironment } from "./desktop-environment";
import { createHirobaTransport } from "./hiroba-transport";
import { keptFileStore } from "./kept-file-store";
import { OFF_SCREEN_OPTIONS, showOffScreen } from "./off-screen";
import { createDiskPictureStore } from "./picture-disk-store";
import { handlePicturesOut } from "./pictures-out";
import { createPipelineHistoryStore } from "./pipeline-history-store";
import { saveReads } from "./save-reads";
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

// A screen with less room than the window's content gives what its work area holds, less the
// title bar and the borders.
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
const keepSession = (value: string | null) => {
  sessionCookie = value;
  sessionStore?.save(value);
};
// A session Hiroba ends is ended here too, and the services let go of what they held of it.
const setSession = (value: string | null) => {
  if (value === null) {
    void services.forget();
  } else {
    keepSession(value);
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

const inDataFolder = (...names: string[]) => join(app.getPath("userData"), ...names);
const services = createHirobaServices({
  endpoints,
  sites: environment,
  platform: "desktop",
  now: environment.now,
  hiroba: readTransport,
  external: createUpdateFeedTransport({ userAgent, hirobaOrigin: endpoints.hirobaOrigin }),
  pictureLimits: DESKTOP_PICTURE_LIMITS,
  stores: {
    pipeline: (name) =>
      createPipelineHistoryStore(inDataFolder(DATA_FOLDER.pipelines, `${name}.json`)),
    kept: (thing) => keptFileStore(inDataFolder(), thing),
    pictures: createDiskPictureStore(inDataFolder(DATA_FOLDER.pictures)),
    charts: createDiskPictureStore(inDataFolder(DATA_FOLDER.charts)),
    densities: createDiskPictureStore(inDataFolder(DATA_FOLDER.densities)),
    drawnCharts: createDiskPictureStore(inDataFolder(DATA_FOLDER.drawnCharts)),
  },
  signedIn: () => sessionCookie !== null,
  endSession: () => keepSession(null),
});
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

const started = app.whenReady().then(async () => {
  if (app.isPackaged) {
    // On macOS copy, paste and quit go through the menu bar: keep its app and Edit menus.
    Menu.setApplicationMenu(
      process.platform === "darwin"
        ? Menu.buildFromTemplate([{ role: "appMenu" }, { role: "editMenu" }])
        : null,
    );
  }
  serveWebBundle();
  sessionStore = createSessionStore(join(app.getPath("userData"), DATA_FOLDER.session));
  sessionCookie = sessionStore.load();
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );

  const room = screen.getPrimaryDisplay().workAreaSize.height - WINDOW_FRAME_PX;
  const mainWindow = new BrowserWindow({
    useContentSize: true,
    width: WINDOW_CONTENT_PX.width,
    // Off every display, the window fits none, so it has the same size on any machine.
    height: environment.offScreen
      ? WINDOW_CONTENT_PX.height
      : Math.min(WINDOW_CONTENT_PX.height, room),
    // A packaged app has no menu; a development one keeps its shortcuts, its bar shown by Alt.
    autoHideMenuBar: true,
    // Shown once the page has drawn its launch cover, so no blank window comes first.
    show: false,
    ...(environment.offScreen ? OFF_SCREEN_OPTIONS : {}),
    webPreferences: {
      preload: join(app.getAppPath(), "out", "electron", "preload.cjs"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (environment.offScreen) {
    showOffScreen(mainWindow);
  } else {
    mainWindow.once("ready-to-show", () => mainWindow.show());
  }
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

  const port = queuePort(services.pipelines, {
    ...services.verbs,
    async isSignedIn() {
      return sessionCookie !== null;
    },
    async signIn(): Promise<SignInOutcome> {
      signInAttempt?.cancel();
      setSession(null);
      const attempt = openSignInWindow(mainWindow, endpoints, userAgent, environment.offScreen);
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
  });

  // Scheme and host, compared by hand: URL.origin is "null" for a custom scheme such as app:.
  const originOf = (raw: string) => {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`;
  };
  const expectedOrigin = originOf(devServerUrl ?? APP_ORIGIN);
  const home = devServerUrl ?? `${APP_ORIGIN}/`;
  const trusted = (event: IpcMainInvokeEvent) => {
    const url = event.senderFrame?.url;
    return url !== undefined && originOf(url) === expectedOrigin;
  };
  // The window stays on the app's own page, which it may load again as a crash's note offers.
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (originOf(url) !== expectedOrigin || new URL(url).pathname !== "/") {
      event.preventDefault();
    }
  });
  // A page process that ended leaves the window blank: its note stands in, reloading when asked.
  mainWindow.webContents.on("render-process-gone", (_event, { reason }) => {
    if (reason === "clean-exit" || mainWindow.isDestroyed()) {
      return;
    }
    const note = new URL(home);
    note.hash = `${PAGE_GONE_FRAGMENT}${reason}`;
    // A note that will not load either must not become an unhandled rejection in this process.
    mainWindow.loadURL(note.href).catch(() => undefined);
  });
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
  handlePicturesOut({ window: mainWindow, trusted, folder: environment.picturesFolder });

  await mainWindow.loadURL(home);
});
// A start that failed leaves no window, or a blank one: the system's box says so, in its language.
started.catch((error: unknown) => {
  const { t } = createTranslator(detectLocale(app.getPreferredSystemLanguages()));
  const code = t("failure.code", { code: crashCodeOf("start", error) });
  dialog.showErrorBox(app.getName(), `${t("crash.start")}\n\n${code}`);
  app.exit(1);
});

app.on("window-all-closed", () => app.quit());
