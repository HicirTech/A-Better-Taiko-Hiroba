import type { TitleOption } from "@abth/core";
import type { MessageKey } from "@abth/i18n";
import { useCallback, useReducer, useRef } from "react";

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
  readonly lane: PictureLane;
  readonly onSessionGone: (notice: MessageKey) => void;
}

export interface TitleEditor {
  readonly step: TitleStep;
  /** The undo this device offers now, if any; from the platform, never Hiroba. */
  readonly undoable: UndoSummaryOf<"title"> | null;
  readonly reading: boolean;
  readonly writing: boolean;
  readonly canRead: boolean;
  read(): Promise<void>;
  refreshUndo(): Promise<void>;
  /** Drops everything of the section when a session ends or begins. */
  forget(): void;
  pick(option: TitleOption | null): void;
  review(): void;
  back(): void;
  save(): Promise<void>;
  undo(): Promise<void>;
}

export function useTitleEditor({ port, lane, onSessionGone }: TitleEditorOptions): TitleEditor {
  const [step, dispatch] = useReducer(reduceTitle, UNREAD);
  const sessionGeneration = useRef(0);
  // One read at a time, also under StrictMode's double effects, which would ask Hiroba twice.
  const reading = useRef<number | null>(null);
  const writing = useRef(false);
  const { undoable, refreshUndo, clearUndo } = useUndoOffer(port, "title", sessionGeneration);

  const forget = useCallback(() => {
    sessionGeneration.current += 1;
    dispatch({ type: "forget" });
    clearUndo();
  }, [clearUndo]);

  const mayRead = step.name === "unread" || canReadTitlesAgain(step);
  const read = useCallback(async () => {
    const mine = sessionGeneration.current;
    if (!mayRead || reading.current === mine || writing.current) {
      return;
    }

    reading.current = mine;
    dispatch({ type: "readStarted" });
    const result = await port.openTitleEditor();
    if (reading.current === mine) {
      reading.current = null;
    }
    if (mine !== sessionGeneration.current) {
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

  const sendWrite = async (
    begin: TitleAction,
    send: () => Promise<WriteOutcomeView<TitleState>>,
  ) => {
    writing.current = true;
    const mine = sessionGeneration.current;
    dispatch(begin);
    const outcome = await sendHeld(lane, send);
    writing.current = false;
    if (mine === sessionGeneration.current) {
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
