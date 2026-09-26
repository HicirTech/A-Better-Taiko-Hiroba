/**
 * The contract between the interface and a platform layer: what the interface may ask, and the
 * only shapes that come back. Values here are plain data; nothing imports the parser, so the
 * Electron preload can use this domain without bundling it.
 */
export type {
  HirobaSessionPort,
  ProfileView,
  ReadFailure,
  ReadFailureKind,
  SignInOutcome,
} from "./types";
