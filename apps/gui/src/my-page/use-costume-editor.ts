import { sameCostume } from "@abth/core";
import type { MessageKey } from "@abth/i18n";
import { useCallback, useReducer, useRef } from "react";

import type { PictureLane } from "../pictures/picture-lane";
import { FAILURE_MESSAGE, SESSION_GONE } from "../read-failure-message";
import {
  type CostumeHistoryEntry,
  changedTheCostume,
  type HirobaSessionPort,
  type WriteOutcomeView,
} from "../session-port";
import {
  canReadEditorAgain,
  type EditorStep,
  isWriting,
  previewSetOf,
  reduceEditor,
  UNREAD,
} from "./costume-editor-state";
import type { ColourPart, SlotPart } from "./costume-parts";
import type { PreviewState } from "./costume-preview";
import { useCostumePreview } from "./costume-preview-box";
import { useCostumeHistory } from "./use-costume-history";
import { sendHeld, sessionNoticeOf } from "./write-ending";

export interface CostumeEditorOptions {
  readonly port: HirobaSessionPort;
  readonly lane: PictureLane;
  /** The Costume page is shown, signed in: the only time Hiroba is asked for the set's picture. */
  readonly shown: boolean;
  readonly onSessionGone: (notice: MessageKey) => void;
}

export interface CostumeEditor {
  readonly step: EditorStep;
  readonly preview: PreviewState;
  /** The player's earlier costumes, newest first; from the platform, never Hiroba. */
  readonly history: readonly CostumeHistoryEntry[];
  readonly reading: boolean;
  readonly writing: boolean;
  readonly canRead: boolean;
  read(): Promise<void>;
  /** Drops everything of the editor, its picture included, when a session ends or begins. */
  forget(): void;
  pickColour(part: ColourPart, id: number): void;
  pickItem(part: SlotPart, id: number): void;
  /** Puts a set from the history in the draft, with its picture shown at once if it has one. */
  pickHistory(entry: CostumeHistoryEntry): void;
  /** Puts the draft back to the set as read. */
  reset(): void;
  save(): Promise<void>;
}

export function useCostumeEditor({
  port,
  lane,
  shown,
  onSessionGone,
}: CostumeEditorOptions): CostumeEditor {
  const [step, dispatch] = useReducer(reduceEditor, UNREAD);
  const {
    preview,
    reset: resetPreview,
    keep: keepPreview,
  } = useCostumePreview(port, previewSetOf(step), shown);
  const sessionGeneration = useRef(0);
  const { history, refreshHistory, clearHistory } = useCostumeHistory(port, sessionGeneration);
  // One read at a time, also under StrictMode's double effects, which would ask Hiroba twice.
  const reading = useRef<number | null>(null);
  const writing = useRef(false);

  const forget = useCallback(() => {
    sessionGeneration.current += 1;
    dispatch({ type: "forget" });
    clearHistory();
    resetPreview();
  }, [clearHistory, resetPreview]);

  const mayRead = step.name === "unread" || canReadEditorAgain(step);
  const read = useCallback(async () => {
    const mine = sessionGeneration.current;
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
      await refreshHistory();
    }
  }, [mayRead, port, lane, forget, onSessionGone, refreshHistory]);

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
    void refreshHistory();
  };

  const save = async () => {
    if (step.name !== "editing" || sameCostume(step.editor.state, step.draft) || writing.current) {
      return;
    }

    const { editor, draft } = step;
    writing.current = true;
    const mine = sessionGeneration.current;
    dispatch({ type: "saveStarted" });
    const outcome = await sendHeld(lane, () =>
      port.changeCostume({ expected: editor.state, target: draft }),
    );
    writing.current = false;
    if (mine === sessionGeneration.current) {
      writeEnded(outcome);
    }
  };

  return {
    step,
    preview,
    history,
    reading: step.name === "loading",
    writing: isWriting(step),
    canRead: canReadEditorAgain(step),
    read,
    forget,
    pickColour: (part, id) => dispatch({ type: "pickedColour", part, id }),
    pickItem: (part, id) => dispatch({ type: "pickedItem", part, id }),
    pickHistory: (entry) => {
      if (entry.picture !== null) {
        keepPreview(entry.set, entry.picture);
      }
      dispatch({ type: "pickedHistory", set: entry.set });
    },
    reset: () => dispatch({ type: "reset" }),
    save,
  };
}
