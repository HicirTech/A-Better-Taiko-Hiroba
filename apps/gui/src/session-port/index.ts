/**
 * The contract between the interface and a platform layer: what the interface may ask, with which
 * arguments, and the only shapes that come back. Values here are plain data and channel names;
 * nothing imports the parser, so the Electron preload can use this domain without bundling it.
 */
export { type ArgumentCheck, isCostumeSet, PORT_ARGUMENTS, WRITE_KINDS } from "./arguments";
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
  UndoSummary,
  WriteKind,
  WriteOutcomeView,
} from "./types";
