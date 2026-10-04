import type { TitleOption } from "@abth/core";
import type { MessageKey } from "@abth/i18n";
import { useCallback, useReducer, useRef } from "react";

import { sendHeld, sessionNoticeOf } from "../my-page/write-ending";
import type { PictureLane } from "../pictures/picture-lane";
import { FAILURE_MESSAGE, SESSION_GONE } from "../read-failure-message";
import type { HirobaSessionPort, TitleState, WriteOutcomeView } from "../session-port";
import {
  canReadTitlesAgain,
  changesTitle,
  isWritingTitle,
  movedTheTitle,
  reduceTitle,
  type TitleStep,
  UNREAD,
} from "./title-editor-state";

export interface TitleEditorOptions {
  readonly port: HirobaSessionPort;
  readonly lane: PictureLane;
  readonly onSessionGone: (notice: MessageKey) => void;
  /** A write left the title moved, or maybe moved: the window reads my page again for the plate. */
  readonly onMoved: () => void;
}

export interface TitleEditor {
  readonly step: TitleStep;
  readonly reading: boolean;
  readonly writing: boolean;
  readonly canRead: boolean;
  read(): Promise<void>;
  /** Drops everything of the section when a session ends or begins. */
  forget(): void;
  pick(option: TitleOption | null): void;
  save(): Promise<void>;
}

export function useTitleEditor({
  port,
  lane,
  onSessionGone,
  onMoved,
}: TitleEditorOptions): TitleEditor {
  const [step, dispatch] = useReducer(reduceTitle, UNREAD);
  const sessionGeneration = useRef(0);
  // One read at a time, also under StrictMode's double effects, which would ask Hiroba twice.
  const reading = useRef<number | null>(null);
  const writing = useRef(false);

  const forget = useCallback(() => {
    sessionGeneration.current += 1;
    dispatch({ type: "forget" });
  }, []);

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
  }, [mayRead, port, forget, onSessionGone]);

  const writeEnded = (outcome: WriteOutcomeView<TitleState>) => {
    dispatch({ type: "writeEnded", outcome });
    const gone = sessionNoticeOf(outcome);
    if (gone !== null) {
      forget();
      onSessionGone(gone);
      return;
    }

    if (movedTheTitle(outcome)) {
      onMoved();
    }
  };

  const save = async () => {
    if (
      step.name !== "idle" ||
      step.picked === null ||
      !changesTitle(step.editor, step.picked) ||
      writing.current
    ) {
      return;
    }

    const { editor, picked } = step;
    writing.current = true;
    const mine = sessionGeneration.current;
    dispatch({ type: "saveStarted" });
    const outcome = await sendHeld(lane, () =>
      port.changeTitle({
        expected: editor.state,
        target: { id: picked.id, title: picked.label },
      }),
    );
    writing.current = false;
    if (mine === sessionGeneration.current) {
      writeEnded(outcome);
    }
  };

  return {
    step,
    reading: step.name === "loading",
    writing: isWritingTitle(step),
    canRead: canReadTitlesAgain(step),
    read,
    forget,
    pick: (option) => dispatch({ type: "picked", option }),
    save,
  };
}
