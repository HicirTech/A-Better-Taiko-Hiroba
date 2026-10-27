import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

import { base64Of } from "../shared/png-answer";
import type { SystemShare } from "./system-share";

// In the app's cache, emptied (where there is one) before each picture: it keeps the last alone.
const CACHED = "snapshots";
/** A saved picture's folder in the shared Documents, an album of the gallery. */
const SAVED = "A Better Taiko Hiroba";
// What Capacitor's Share plugin rejects with when the sheet closes without a choice.
const SHEET_CLOSED = "Share canceled";

/** Android's: the system's share sheet, and a file in the shared Documents where the system lets
 * the app keep one without asking, as from Android 11 on (the plugin says granted there). */
export async function androidShare(): Promise<SystemShare> {
  const { publicStorage } = await Filesystem.checkPermissions();
  return {
    ways: publicStorage === "granted" ? ["share", "save"] : ["share"],
    hand: (way, picture, name) => (way === "save" ? saved(picture, name) : shared(picture, name)),
  };
}

/** The plugin has the gallery take the file in once it is written. */
async function saved(picture: Uint8Array, name: string): Promise<"done"> {
  await Filesystem.writeFile({
    path: `${SAVED}/${name}`,
    data: base64Of(picture),
    directory: Directory.Documents,
    recursive: true,
  });
  return "done";
}

async function shared(picture: Uint8Array, name: string): Promise<"done" | "dismissed"> {
  await Filesystem.rmdir({ path: CACHED, directory: Directory.Cache, recursive: true }).catch(
    () => undefined,
  );
  const { uri } = await Filesystem.writeFile({
    path: `${CACHED}/${name}`,
    data: base64Of(picture),
    directory: Directory.Cache,
    recursive: true,
  });
  try {
    await Share.share({ files: [uri] });
    return "done";
  } catch (error) {
    if (error instanceof Error && error.message === SHEET_CLOSED) {
      return "dismissed";
    }
    throw error;
  }
}
