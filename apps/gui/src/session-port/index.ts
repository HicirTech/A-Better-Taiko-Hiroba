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
} from "./arguments";
export { BRIDGE_CHANNELS } from "./bridge-channels";
export { checkedPort } from "./checked-port";
export { changedTheCostume } from "./costume-changed";
export { PORT_QUEUEING, type VerbQueueing, type VerbsQueued } from "./queueing";
export type {
  CostumeChange,
  CostumeEditorView,
  CostumeHistoryEntry,
  CostumePreviewFailure,
  CostumeSet,
  CostumeSlot,
  CrownKind,
  DanNumber,
  DanView,
  HirobaSessionPort,
  IconWant,
  NameChange,
  NameState,
  PictureFailure,
  PictureView,
  PictureWant,
  ProfileView,
  ReadFailure,
  ReadFailureKind,
  ReadProfileOptions,
  RenameState,
  SignInOutcome,
  TitleChange,
  TitleEditorView,
  TitleState,
  TitleTarget,
  WriteKind,
  WriteOutcomeView,
  WriteSets,
} from "./types";
