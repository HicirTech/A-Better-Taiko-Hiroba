/**
 * The contract between the interface and a platform layer: the only shapes that come back. Values
 * here are plain data; nothing imports the parser, so the Electron preload can use this domain
 * without bundling it.
 */
export type { ProfileView, ReadFailure, ReadFailureKind } from "./types";
