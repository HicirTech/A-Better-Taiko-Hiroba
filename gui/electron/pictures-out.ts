import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  app,
  type BrowserWindow,
  ClipboardItem,
  clipboard,
  dialog,
  type IpcMainInvokeEvent,
  ipcMain,
} from "electron";

import { hasPngSignature } from "../src/shared/png-answer";
import { PICTURE_CHANNELS } from "../src/shared/session-port/bridge-channels";

/** Far above a snapshot's few megabytes: more is no picture the page made. */
const MAX_PNG_BYTES = 64 * 1024 * 1024;
/** A file's name and no folder: letters, digits, `_`, `-` and `.`, ending in `.png`. */
const SAVED_NAME = /^[\w.-]{1,96}\.png$/;

/** The page's bytes, once they are a PNG from the app's own page. */
function pngFrom(trusted: boolean, png: unknown): Uint8Array<ArrayBuffer> {
  if (!trusted) {
    throw new Error("Refused a picture from an untrusted frame");
  }
  if (!(png instanceof Uint8Array) || png.byteLength > MAX_PNG_BYTES || !hasPngSignature(png)) {
    throw new Error("Refused a picture that is no PNG");
  }
  return new Uint8Array(png);
}

/** A picture's ways out of the app: copied to the clipboard, or saved where the player picks. */
export function handlePicturesOut({
  window,
  trusted,
  folder,
}: {
  readonly window: BrowserWindow;
  readonly trusted: (event: IpcMainInvokeEvent) => boolean;
  /** Where a picture is saved without the save box; undefined asks the player where. */
  readonly folder: string | undefined;
}): void {
  ipcMain.handle(PICTURE_CHANNELS.copy, async (event, png: unknown) => {
    const picture = new Blob([pngFrom(trusted(event), png)], { type: "image/png" });
    await clipboard.write([new ClipboardItem({ "image/png": picture })]);
  });
  ipcMain.handle(PICTURE_CHANNELS.save, async (event, png: unknown, name: unknown) => {
    const bytes = pngFrom(trusted(event), png);
    if (typeof name !== "string" || !SAVED_NAME.test(name)) {
      throw new Error("Refused a picture's name that is no file's");
    }
    const path = folder === undefined ? await askWhere(window, name) : join(folder, name);
    if (path === null) {
      return "cancelled";
    }
    await writeFile(path, bytes);
    return "saved";
  });
}

async function askWhere(window: BrowserWindow, name: string): Promise<string | null> {
  const { canceled, filePath } = await dialog.showSaveDialog(window, {
    defaultPath: join(app.getPath("pictures"), name),
    filters: [{ name: "PNG", extensions: ["png"] }],
  });
  return canceled || filePath === undefined || filePath === "" ? null : filePath;
}
