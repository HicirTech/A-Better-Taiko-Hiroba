/**
 * The contract between the interface and a platform layer: what the interface may ask, with which
 * arguments, and the only shapes that come back. Values here are plain data and channel names;
 * nothing imports the parser, so the Electron preload can use this domain without bundling it.
 */
export {
  type ArgumentCheck,
  isCostumeSet,
  isNameState,
  isPictureWant,
  isTitleState,
  isTitleTarget,
  isWhole,
  PORT_ARGUMENTS,
  UNDO_SET_GUARDS,
  WRITE_KINDS,
} from "./arguments";
export { BRIDGE_CHANNELS } from "./bridge-channels";
export { checkedPort } from "./checked-port";
export { changedTheCostume } from "./costume-changed";
export { PORT_QUEUEING, type VerbQueueing, type VerbsQueued } from "./queueing";
export type {
  CostumeChange,
  CostumeEditorView,
  CostumePreviewFailure,
  CostumeSet,
  CostumeSlot,
  DanNumber,
  DanView,
  HirobaSessionPort,
  NameChange,
  NameState,
  PictureFailure,
  PictureView,
  PictureWant,
  ProfileView,
  ReadFailure,
  ReadFailureKind,
  RenameState,
  SignInOutcome,
  TitleChange,
  TitleEditorView,
  TitleState,
  TitleTarget,
  UndoSummary,
  UndoSummaryOf,
  WriteKind,
  WriteOutcomeView,
  WriteSets,
} from "./types";
