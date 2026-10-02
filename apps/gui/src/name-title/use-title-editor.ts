import type { TitleOption } from "@abth/core";
import type { MessageKey } from "@abth/i18n";
import { useCallback, useEffect, useReducer, useRef } from "react";

import { useUndoOffer } from "../my-page/use-undo-offer";
import { sendHeld, sessionNoticeOf } from "../my-page/write-ending";
import type { PictureLane } from "../pictures/picture-lane";
import { FAILURE_MESSAGE, SESSION_GONE } from "../read-failure-message";
import type {
  HirobaSessionPort,
  TitleState,
  UndoSummaryOf,
  WriteOutcomeView,
} from "../session-port";
import {
  canReadTitlesAgain,
  isWritingTitle,
  reduceTitle,
  type TitleAction,
  type TitleStep,
  UNREAD,
} from "./title-editor-state";

export interface TitleEditorOptions {
  readonly port: HirobaSessionPort;
  /** The window's lane for Hiroba's pictures: it is held while a write runs. */
  readonly lane: PictureLane;
  /**
   * Whether the Name & title page is shown, signed in: the only time the list of titles is read.
   */
  readonly shown: boolean;
  /** The session ended under the section: back to signing in, with what happened. */
  readonly onSessionGone: (notice: MessageKey) => void;
}

/** The Title section as the Name & title page draws and drives it. */
export interface TitleEditor {
  readonly step: TitleStep;
  /** The title undo this device offers now, if any: asks the platform, never Hiroba. */
  readonly undoable: UndoSummaryOf<"title"> | null;
  /** The list of titles is being read (again). */
  readonly reading: boolean;
  /** A save or an undo is on its way: nothing else asks Hiroba anything meanwhile. */
  readonly writing: boolean;
  /** The list may be read again from here. */
  readonly canRead: boolean;
  /** Reads the list, now: the first time by itself when the page is shown, then on request. */
  read(): Promise<void>;
  /** Asks the platform for the undo on offer, as after my page is read. */
  refreshUndo(): Promise<void>;
  /** The session is over, or another one begins: nothing of the section is kept. */
  forget(): void;
  pick(option: TitleOption | null): void;
  review(): void;
  back(): void;
  save(): Promise<void>;
  undo(): Promise<void>;
}

/**
 * The Title section, held above the page so that a pick, a review or an outcome outlives a visit to
 * another page and a read of my page. The list of titles is read when the page is first shown in a
 * session, never at start-up and never while the page is not shown; after that only when asked, and
 * a write's own read-back brings the title worn up to date.
 */
export function useTitleEditor({
  port,
  lane,
  shown,
  onSessionGone,
}: TitleEditorOptions): TitleEditor {
  const [step, dispatch] = useReducer(reduceTitle, UNREAD);
  /** Bumped when the session ends: what a request begun before it brings back is dropped. */
  const session = useRef(0);
  /**
   * The session a read is on its way for: one read at a time, and one under StrictMode, which runs
   * an effect twice in development, where a second would be a second request to Hiroba.
   */
  const reading = useRef<number | null>(null);
  /** A save or an undo is on its way: one press sends one write. */
  const writing = useRef(false);
  const { undoable, refreshUndo, clearUndo } = useUndoOffer(port, "title", session);

  const forget = useCallback(() => {
    session.current += 1;
    dispatch({ type: "forget" });
    clearUndo();
  }, [clearUndo]);

  const mayRead = step.name === "unread" || canReadTitlesAgain(step);
  const read = useCallback(async () => {
    const mine = session.current;
    if (!mayRead || reading.current === mine || writing.current) {
      return;
    }

    reading.current = mine;
    dispatch({ type: "readStarted" });
    const result = await port.openTitleEditor();
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
  }, [mayRead, port, forget, onSessionGone, refreshUndo]);

  useEffect(() => {
    if (shown && step.name === "unread") {
      void read();
    }
  }, [shown, step.name, read]);

  /**
   * A write ended, a save or an undo: the page shows it, and the undo on offer is asked for again.
   * One that found the session gone goes back to signing in, as a read does.
   */
  const writeEnded = (outcome: WriteOutcomeView<TitleState>) => {
    dispatch({ type: "writeEnded", outcome });
    const gone = sessionNoticeOf(outcome);
    if (gone !== null) {
      forget();
      onSessionGone(gone);
      return;
    }

    void refreshUndo();
  };

  /**
   * Sends one write, a save or an undo: no picture even queues behind it, and a second press while
   * it runs is turned away.
   */
  const sendWrite = async (
    begin: TitleAction,
    send: () => Promise<WriteOutcomeView<TitleState>>,
  ) => {
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

    const { editor, picked } = step;
    await sendWrite({ type: "saveStarted" }, () =>
      port.changeTitle({
        expected: editor.state,
        target: { id: picked.id, title: picked.label },
      }),
    );
  };

  const undo = async () => {
    if ((step.name !== "idle" && step.name !== "done") || writing.current) {
      return;
    }

    await sendWrite({ type: "undoStarted" }, () => port.undo("title"));
  };

  return {
    step,
    undoable,
    reading: step.name === "loading",
    writing: isWritingTitle(step),
    canRead: canReadTitlesAgain(step),
    read,
    refreshUndo,
    forget,
    pick: (option) => dispatch({ type: "picked", option }),
    review: () => dispatch({ type: "review" }),
    back: () => dispatch({ type: "back" }),
    save,
    undo,
  };
}
