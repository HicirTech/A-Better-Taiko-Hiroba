import { app, BrowserWindow, Menu, session } from "electron";

import { APP_ORIGIN, registerAppScheme, serveWebBundle } from "./app-protocol";

// Development only, and never in a packaged build: the renderer from Vite's dev server.
const devServerUrl = app.isPackaged ? undefined : process.env.ABTH_DEV_SERVER_URL;

// Hiroba answers anything that does not look like a complete browser with a data-less page. The
// default string also names Electron and the app, so it is replaced with plain Chrome's, in the
// reduced form Chrome itself sends.
const chromeMajor = process.versions.chrome.split(".")[0];
const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Safari/537.36`;
app.userAgentFallback = userAgent;

// Development only: lets the end-to-end run keep its profile out of the real %APPDATA%.
if (!app.isPackaged && process.env.ABTH_DEV_USER_DATA) {
  app.setPath("userData", process.env.ABTH_DEV_USER_DATA);
}

app.enableSandbox();
registerAppScheme();

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.whenReady().then(async () => {
  if (app.isPackaged) {
    Menu.setApplicationMenu(null);
  }
  serveWebBundle();
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );

  const mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());

  await mainWindow.loadURL(devServerUrl ?? `${APP_ORIGIN}/`);
});

app.on("window-all-closed", () => app.quit());
