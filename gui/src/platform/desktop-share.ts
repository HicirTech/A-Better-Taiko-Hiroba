import type { SystemShare } from "./system-share";

/** What the Electron preload lays beside the port: a picture to the clipboard, or to a file. */
export interface DesktopPictures {
  copy(png: Uint8Array): Promise<void>;
  /** Asks the player where; cancelled when they choose nowhere. */
  save(png: Uint8Array, name: string): Promise<"saved" | "cancelled">;
}

/** The desktop's: the clipboard, or a file where the player picks, through the main process. */
export const desktopShare = (pictures: DesktopPictures): SystemShare => ({
  ways: ["copy", "save"],
  hand: async (way, png, name) => {
    if (way === "save") {
      return (await pictures.save(png, name)) === "saved" ? "done" : "dismissed";
    }
    await pictures.copy(png);
    return "done";
  },
});
