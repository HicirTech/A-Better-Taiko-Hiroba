// The interface/platform contract. It imports no parser, so the Electron preload can use it.
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
  ReadProfileOptions,
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
