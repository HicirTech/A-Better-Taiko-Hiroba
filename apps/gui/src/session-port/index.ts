/**
 * The contract between the interface and a platform layer: what the interface may ask, with which
 * arguments, and the only shapes that come back. Values here are plain data and channel names;
 * nothing imports the parser, so the Electron preload can use this domain without bundling it.
 */
export { type ArgumentCheck, PORT_ARGUMENTS } from "./arguments";
export { BRIDGE_CHANNELS } from "./bridge-channels";
export type {
  CostumeChange,
  CostumeEditorView,
  CostumeSet,
  DanView,
  EnabledWrite,
  HirobaSessionPort,
  ProfileView,
  ReadFailure,
  ReadFailureKind,
  SignInOutcome,
  WriteKind,
  WriteOutcomeView,
} from "./types";
