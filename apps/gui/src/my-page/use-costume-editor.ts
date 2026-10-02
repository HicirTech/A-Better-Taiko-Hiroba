import type { MessageKey } from "@abth/i18n";
import { useCallback, useReducer, useRef } from "react";

import type { PictureLane } from "../pictures/picture-lane";
import { FAILURE_MESSAGE, SESSION_GONE } from "../read-failure-message";
import {
  changedTheCostume,
  type HirobaSessionPort,
  type UndoSummaryOf,
  type WriteOutcomeView,
} from "../session-port";
import {
  canReadEditorAgain,
  type EditorAction,
  type EditorStep,
  isWriting,
  previewSetOf,
  reduceEditor,
  UNREAD,
} from "./costume-editor-state";
import type { ColourPart, SlotPart } from "./costume-parts";
import type { PreviewState } from "./costume-preview";
import { useCostumePreview } from "./costume-preview-box";
import { useUndoOffer } from "./use-undo-offer";
import { sendHeld, sessionNoticeOf } from "./write-ending";

export interface CostumeEditorOptions {
  readonly port: HirobaSessionPort;
  /** The window's lane for Hiroba's pictures: the items' thumbnails come through it. */
  readonly lane: PictureLane;
  /**
   * Whether the Costume page is shown, signed in: the only time Hiroba is asked for a picture of
   * the set.
   */
  readonly shown: boolean;
  /** The session ended under the editor: back to signing in, with what happened. */
  readonly onSessionGone: (notice: MessageKey) => void;
}

/** The costume editor as the Costume page draws and drives it. */
export interface CostumeEditor {
  readonly step: EditorStep;
  readonly preview: PreviewState;
  /** The costume undo this device offers now, if any: asks the platform, never Hiroba. */
  readonly undoable: UndoSummaryOf<"costume"> | null;
  /** The editor is being read (again). */
  readonly reading: boolean;
  /** A save or an undo is on its way: nothing else asks Hiroba anything meanwhile. */
  readonly writing: boolean;
  /** The editor may be read again from here. */
  readonly canRead: boolean;
  /** Reads the editor, now: the window asks for the first when the page is shown, then on request. */
  read(): Promise<void>;
  /** Asks the platform for the undo on offer, as after my page is read. */
  refreshUndo(): Promise<void>;
  /** The session is over, or another one begins: nothing of the editor is kept. */
  forget(): void;
  pickColour(part: ColourPart, id: number): void;
  pickItem(part: SlotPart, id: number): void;
  /** Puts the draft back to the set as read. */
  reset(): void;
  review(): void;
  back(): void;
  save(): Promise<void>;
  undo(): Promise<void>;
}

/**
 * The costume editor, held above the Costume page so that a draft, a review or an outcome outlives
 * a visit to another page. It is read when the window asks for it: the first time when the page is
 * first shown in a session and no write runs, never at start-up and never while the page is not
 * shown; after that only when asked, and a write's own read-back brings the set up to date. A
 * draft made over the set last read is kept by a read that finds it unchanged. Hiroba's picture
 * of the set is asked for only while the page is shown.
 */
export function useCostumeEditor({
  port,
  lane,
  shown,
  onSessionGone,
}: CostumeEditorOptions): CostumeEditor {
  const [step, dispatch] = useReducer(reduceEditor, UNREAD);
  const preview = useCostumePreview(port, previewSetOf(step), shown);
  /** Bumped when the session ends: what a request begun before it brings back is dropped. */
  const session = useRef(0);
  const { undoable, refreshUndo, clearUndo } = useUndoOffer(port, "costume", session);
  /**
   * The session a read is on its way for: one read at a time, and one under StrictMode, which
   * runs an effect twice in development, where a second would be a second request to Hiroba.
   */
  const reading = useRef<number | null>(null);
  /** A save or an undo is on its way: one press sends one write. */
  const writing = useRef(false);

  const forget = useCallback(() => {
    session.current += 1;
    dispatch({ type: "forget" });
    clearUndo();
  }, [clearUndo]);

  const mayRead = step.name === "unread" || canReadEditorAgain(step);
  const read = useCallback(async () => {
    const mine = session.current;
    if (!mayRead || reading.current === mine || writing.current) {
      return;
    }

    reading.current = mine;
    // A thumbnail that did not come last time is asked for again once, in this reading.
    lane.forgetFailures("costumeItem");
    dispatch({ type: "readStarted" });
    const result = await port.openCostumeEditor();
    if (reading.current === mine) {
      reading.current = null;
    }
    if (mine !== session.current) {
      return;
    }

    if (!result.ok && SESSION_GONE.has(result.error.kind)) {
      forget();
      onSessionGone(FAILURE_MESSAGE[result.error.kind]);
      return;
    }

    dispatch({ type: "readEnded", result });
    if (result.ok) {
      // The read settles a write whose end was not known, and dates a record gone stale.
      await refreshUndo();
    }
  }, [mayRead, port, lane, forget, onSessionGone, refreshUndo]);

  /**
   * A write ended, a save or an undo: the page shows it, and the undo on offer is asked for again.
   * A change that read back as planned asks for the portrait again, which the platform then
   * fetches anew; any other asks for nothing. One that found the session gone goes back to signing
   * in, as a read does.
   */
  const writeEnded = (outcome: WriteOutcomeView) => {
    dispatch({ type: "writeEnded", outcome });
    const gone = sessionNoticeOf(outcome);
    if (gone !== null) {
      forget();
      onSessionGone(gone);
      return;
    }

    if (changedTheCostume(outcome)) {
      lane.renew("myDon");
    }
    void refreshUndo();
  };

  /**
   * Sends one write, a save or an undo: no thumbnail even queues behind it, the one on its way, if
   * any, is all it waits for, and a second press while it runs is turned away.
   */
  const sendWrite = async (begin: EditorAction, send: () => Promise<WriteOutcomeView>) => {
    writing.current = true;
    const mine = session.current;
    dispatch(begin);
    const outcome = await sendHeld(lane, send);
    writing.current = false;
    if (mine === session.current) {
      writeEnded(outcome);
    }
  };

  const save = async () => {
    if (step.name !== "confirming" || writing.current) {
      return;
    }

    const { editor, draft } = step;
    await sendWrite({ type: "saveStarted" }, () =>
      port.changeCostume({ expected: editor.state, target: draft }),
    );
  };

  const undo = async () => {
    if ((step.name !== "editing" && step.name !== "done") || writing.current) {
      return;
    }

    await sendWrite({ type: "undoStarted" }, () => port.undo("costume"));
  };

  return {
    step,
    preview,
    undoable,
    reading: step.name === "loading",
    writing: isWriting(step),
    canRead: canReadEditorAgain(step),
    read,
    refreshUndo,
    forget,
    pickColour: (part, id) => dispatch({ type: "pickedColour", part, id }),
    pickItem: (part, id) => dispatch({ type: "pickedItem", part, id }),
    reset: () => dispatch({ type: "reset" }),
    review: () => dispatch({ type: "review" }),
    back: () => dispatch({ type: "back" }),
    save,
    undo,
  };
}
