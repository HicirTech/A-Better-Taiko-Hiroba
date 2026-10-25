/** How a picture the app made leaves it: the system's share sheet, the clipboard, or a file. */
export type PictureWay = "share" | "copy" | "save";

/** The shell's ways out for a picture the app made, in the order a menu lists them. */
export interface SystemShare {
  readonly ways: readonly PictureWay[];
  /** Hands `png` out by `way`, named `name` where it becomes a file: done, or turned down. */
  hand(way: PictureWay, png: Uint8Array, name: string): Promise<"done" | "dismissed">;
}
