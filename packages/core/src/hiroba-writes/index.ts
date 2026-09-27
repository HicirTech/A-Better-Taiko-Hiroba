/**
 * Writing to Hiroba: the one way every write goes, and the pieces it is built from.
 *
 * A write on Hiroba is a form posted to one of its ajax pages, and the page's markup does not say
 * what the endpoint wants: the rules here come from the site's own scripts and from writes executed
 * and read back on 2026-08-09 (the wiki's Writing-Data page). `postAjax` is the only code that
 * builds a post, and so the only code that reveals a form token; `runWrite` is the only code that
 * sends one, in the order every write takes: read the editor, keep an undo record, pre-check, save
 * once, read the whole set back, and judge by the state rather than by the site's answer.
 */
export { postAjax, readPrecheck, readSaveCode, readSaveMessage } from "./ajax";
export {
  COSTUME_SLOT_KEYS,
  type CostumeSlot,
  checkCostumeTarget,
  costumeAfter,
  draftCostumeChange,
  sameCostume,
} from "./costume-rule";
export {
  COSTUME_WRITE,
  type CostumeEditorView,
  changeCostume,
  openCostumeEditor,
} from "./costume-write";
export { inMaintenance } from "./maintenance";
export { readHirobaPage, sessionEnded } from "./read-page";
export { runWrite } from "./run-write";
export {
  beginPending,
  EMPTY_UNDO_SLOT,
  offeredUndo,
  reconcile,
  settle,
  undoInput,
} from "./undo-record";
export type { PendingUndo, UndoRecord, UndoSlot } from "./undo-record";
export type {
  AjaxAnswer,
  AjaxPost,
  CrossCheck,
  CrossVerdict,
  EditorReading,
  HirobaReadFailure,
  InvalidTarget,
  NotAppliedReason,
  PrecheckVerdict,
  ReadDeps,
  SaveCodes,
  SaveReading,
  StopReason,
  WriteDeps,
  WriteOutcome,
  WriteSpec,
} from "./types";
