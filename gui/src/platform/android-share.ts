import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

import { base64Of } from "../shared/png-answer";
import type { SystemShare } from "./system-share";

// In the app's cache, emptied (where there is one) before each picture: it keeps the last alone.
const FOLDER = "snapshots";
// What Capacitor's Share plugin rejects with when the sheet closes without a choice.
const SHEET_CLOSED = "Share canceled";

/** Android's: the system's share sheet, the picture written to the app's cache for it first. */
export const androidShare: SystemShare = {
  ways: ["share"],
  hand: async (_way, png, name) => {
    await Filesystem.rmdir({ path: FOLDER, directory: Directory.Cache, recursive: true }).catch(
      () => undefined,
    );
    const { uri } = await Filesystem.writeFile({
      path: `${FOLDER}/${name}`,
      data: base64Of(png),
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
  },
};
