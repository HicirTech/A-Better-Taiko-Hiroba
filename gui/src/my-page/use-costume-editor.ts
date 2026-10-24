import { sameCostume } from "@abth/core";
import type { MessageKey } from "@abth/i18n";
import { useCallback, useReducer, useRef } from "react";

import type { PictureLane } from "../pictures/picture-lane";
import type { ColourPart, SlotPart } from "../shared/costume-parts";
import { FAILURE_MESSAGE, SESSION_GONE } from "../shared/read-failure-message";
import { afterRefresh } from "../shared/reads/after-refresh";
import type { ReadStatus } from "../shared/reads/read-run";
import { useReadRun } from "../shared/reads/use-read-run";
import {
  type CostumeHistoryEntry,
  changedTheCostume,
  type HirobaSessionPort,
  type ReadFailure,
  type WriteOutcomeView,
} from "../shared/session-port";
import { sendHeld, sessionNoticeOf } from "../shared/writes/write-ending";
import {
  canReadEditorAgain,
  type EditorStep,
  isWriting,
  previewSetOf,
  reduceEditor,
  UNREAD,
} from "./costume-editor-state";
import type { PreviewState } from "./costume-preview";
import { useCostumePreview } from "./costume-preview-box";
import { useCostumeHistory } from "./use-costume-history";

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
  /** Where the read of the editor stands. */
  readonly status: ReadStatus<ReadFailure, never>;
  readonly reading: boolean;
  readonly writing: boolean;
  readonly canRead: boolean;
  /** Reads the editor, after Hiroba's own refresh when `refreshFirst`. */
  read(refreshFirst?: boolean): Promise<void>;
  /** Drops everything of the editor, its picture included, when a session ends or begins. */
  forget(): void;
  pickColour(part: ColourPart, id: number): void;
  pickItem(part: SlotPart, id: number): void;
  /** Puts a set from the history in the draft, with its picture shown at once if it has one. */
  pickHistory(entry: CostumeHistoryEntry): void;
  /** Puts the draft back to the set as read. */
  reset(): void;
  /** Drops the draft and the last write's notice when the page is left; what was read stays. */
  dropEdits(): void;
  /** Drops the last write's notice once the window has said it. */
  closeNotice(): void;
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
  const writing = useRef(false);
  const [reads, status] = useReadRun<ReadFailure>({
    callFailed: { kind: "callFailed" },
    endsTheSession: (failure) => SESSION_GONE.has(failure.kind),
    onSessionEnded: (failure) => {
      forget();
      onSessionGone(FAILURE_MESSAGE[failure.kind]);
    },
  });

  const forget = useCallback(() => {
    sessionGeneration.current += 1;
    reads.forget();
    dispatch({ type: "forget" });
    clearHistory();
    resetPreview();
  }, [reads, clearHistory, resetPreview]);

  const dropEdits = useCallback(() => {
    reads.settle();
    dispatch({ type: "editsDropped" });
  }, [reads]);

  const mayRead = step.name === "unread" || canReadEditorAgain(step);
  const read = useCallback(
    async (refreshFirst?: boolean) => {
      // One read at a time, also under StrictMode's double effects, which would ask Hiroba twice.
      if (!mayRead || writing.current || reads.status().phase === "reading") {
        return;
      }

      // A thumbnail that did not come last time is asked for again once, in this reading.
      lane.forgetFailures("costumeItem");
      dispatch({ type: "readStarted" });
      const open = () => port.openCostumeEditor();
      const result = await reads.run(() => (refreshFirst ? afterRefresh(port, open) : open()), {
        keep: (answer) => dispatch({ type: "readEnded", result: answer }),
      });
      if (result?.ok === true) {
        await refreshHistory();
      }
    },
    [mayRead, reads, port, lane, refreshHistory],
  );

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
    status,
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
    dropEdits,
    closeNotice: () => dispatch({ type: "noticeClosed" }),
    save,
  };
}
