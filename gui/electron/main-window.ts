import { join } from "node:path";
import { app, BrowserWindow, screen, shell } from "electron";

import { PAGE_GONE_FRAGMENT, WINDOW_CONTENT_PX } from "../src/platform/desktop-window";
import { openableUrlOf } from "../src/shared/updates";
import { OFF_SCREEN_OPTIONS, showOffScreen } from "./off-screen";

// A screen with less room than the window's content gives what its work area holds, less the
// title bar and the borders.
const WINDOW_FRAME_PX = 40;

/** Scheme and host, compared by hand: URL.origin is "null" for a custom scheme such as app:. */
export function originOf(raw: string): string {
  const url = new URL(raw);
  return `${url.protocol}//${url.host}`;
}

/** The app's window, kept on its own page, `home`; shown once that page has drawn. */
export function openMainWindow(home: string, offScreen: boolean): BrowserWindow {
  const room = screen.getPrimaryDisplay().workAreaSize.height - WINDOW_FRAME_PX;
  const mainWindow = new BrowserWindow({
    useContentSize: true,
    width: WINDOW_CONTENT_PX.width,
    // Off every display, the window fits none, so it has the same size on any machine.
    height: offScreen ? WINDOW_CONTENT_PX.height : Math.min(WINDOW_CONTENT_PX.height, room),
    // A packaged app has no menu; a development one keeps its shortcuts, its bar shown by Alt.
    autoHideMenuBar: true,
    // Shown once the page has drawn its launch cover, so no blank window comes first.
    show: false,
    ...(offScreen ? OFF_SCREEN_OPTIONS : {}),
    webPreferences: {
      preload: join(app.getAppPath(), "out", "electron", "preload.cjs"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (offScreen) {
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
  const homeOrigin = originOf(home);
  // The window stays on the app's own page, which it may load again as a crash's note offers.
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (originOf(url) !== homeOrigin || new URL(url).pathname !== "/") {
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
  return mainWindow;
}
