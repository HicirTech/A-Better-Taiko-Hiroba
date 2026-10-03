import { join } from "node:path";
import { err, ok } from "@abth/core";
import { app, BrowserWindow, type IpcMainInvokeEvent, ipcMain, Menu, session } from "electron";

import {
  createHirobaQueue,
  createPictureReader,
  createSessionWrites,
  DESKTOP_PICTURE_LIMITS,
  offeredOf,
  type PictureSources,
  previewCostume,
  queuePort,
  readOwnProfile,
  sessionEnded,
} from "../src/hiroba-session";
import {
  BRIDGE_CHANNELS,
  type CostumeSet,
  type HirobaSessionPort,
  PORT_ARGUMENTS,
  type SignInOutcome,
} from "../src/session-port";
import { APP_ORIGIN, registerAppScheme, serveWebBundle } from "./app-protocol";
import { type DesktopEnvironment, desktopEnvironment } from "./desktop-environment";
import { createHirobaTransport } from "./hiroba-transport";
import { createDiskPictureStore } from "./picture-disk-store";
import { saveReads } from "./save-reads";
import { createSessionStore, type SessionStore } from "./session-store";
import { openSignInWindow, type SignInAttempt } from "./sign-in-window";
import { createUndoStore } from "./undo-store";

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
    owner = null;
    sources = null;
    offered = new Set();
    pictures.forget();
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

// Verbs that ask Hiroba something run through it one at a time, so no read lands inside a write.
const queue = createHirobaQueue();

// A kept picture answers at once, even while a write runs; only a fetch waits in the queue.
const pictures = createPictureReader({
  transport: readTransport,
  endpoints,
  store: createDiskPictureStore(join(app.getPath("userData"), "pictures")),
  queue,
  limits: DESKTOP_PICTURE_LIMITS,
  state: () => ({ signedIn: sessionCookie !== null, offered, owner, sources }),
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

  const mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    webPreferences: {
      preload: join(app.getAppPath(), "out", "electron", "preload.cjs"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());

  const writes = createSessionWrites({
    transport: readTransport,
    endpoints,
    platform: "desktop",
    now: environment.now,
    undoStore: createUndoStore(join(app.getPath("userData"), "undo.json")),
    signedIn: () => sessionCookie !== null,
    endSession: () => setSession(null),
    owner: () => owner,
    costumeChanged: () => pictures.costumeChanged(),
  });

  const port = queuePort(queue, {
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
    readProfile: async (options) => {
      if (sessionCookie === null) {
        return err({ kind: "notSignedIn" });
      }
      if (options?.renewsPortrait !== false) {
        pictures.myPageAsked();
      }
      const read = await readOwnProfile(readTransport, endpoints);
      if (!read.ok) {
        if (sessionEnded(read.error)) {
          setSession(null);
        }
        return read;
      }
      owner = read.value.taikoNo;
      sources = read.value.pictures;
      await pictures.confirm(read.value.taikoNo);
      // Settles a write whose end was unknown, and dates a stale undo record.
      const { view } = read.value;
      await writes.profileRead({
        taikoNo: read.value.taikoNo,
        title: view.title,
        nickname: view.nickname,
      });
      return ok(read.value.view);
    },
    async signOut() {
      setSession(null);
    },
    openCostumeEditor: async () => {
      const read = await writes.openCostumeEditor();
      if (read.ok) {
        offered = offeredOf(read.value);
      }
      return read;
    },
    openTitleEditor: writes.openTitleEditor,
    // Its failure leaves the session be: the next page read says whether it is over.
    previewCostume: async (set: CostumeSet) => {
      if (sessionCookie === null) {
        return err({ code: "preview=notSignedIn" });
      }
      return previewCostume(readTransport, endpoints, set);
    },
    readPicture: (want) => pictures.read(want),
    changeCostume: writes.changeCostume,
    changeTitle: writes.changeTitle,
    changeName: writes.changeName,
    pendingUndo: writes.pendingUndo,
    undo: writes.undo,
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
