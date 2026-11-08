import { join } from "node:path";
import { createTranslator, detectLocale } from "@abth/i18n";
import { app, dialog, type IpcMainInvokeEvent, ipcMain, Menu, session } from "electron";

import { crashCodeOf } from "../src/shared/crash-code";
import { APP_ORIGIN, registerAppScheme, serveWebBundle } from "./app-protocol";
import { type DesktopEnvironment, desktopEnvironment } from "./desktop-environment";
import { openMainWindow, originOf } from "./main-window";
import { handlePicturesOut } from "./pictures-out";
import { createDesktopPort, handlePortCalls } from "./port-handlers";
import { openSignInWindow } from "./sign-in-window";

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
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );

  const home = devServerUrl ?? `${APP_ORIGIN}/`;
  const mainWindow = openMainWindow(home, environment.offScreen);
  const homeOrigin = originOf(home);
  const trusted = (event: IpcMainInvokeEvent) => {
    const url = event.senderFrame?.url;
    return url !== undefined && originOf(url) === homeOrigin;
  };
  const dataFolder = app.getPath("userData");
  const port = createDesktopPort({
    endpoints,
    sites: environment,
    now: environment.now,
    userAgent,
    dataFolder,
    savedReads: process.env.ABTH_DEBUG_SAVE_READS === "1" ? join(dataFolder, "debug") : undefined,
    openSignIn: () => openSignInWindow(mainWindow, endpoints, userAgent, environment.offScreen),
  });
  handlePortCalls(port, ipcMain, trusted);
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
