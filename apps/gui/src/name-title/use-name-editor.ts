import type { MessageKey } from "@abth/i18n";
import { useCallback, useReducer, useRef } from "react";

import { useUndoOffer } from "../my-page/use-undo-offer";
import { sendHeld, sessionNoticeOf } from "../my-page/write-ending";
import type { PictureLane } from "../pictures/picture-lane";
import type {
  HirobaSessionPort,
  NameState,
  ProfileView,
  UndoSummaryOf,
  WriteOutcomeView,
} from "../session-port";
import {
  IDLE,
  isWritingName,
  type NameAction,
  type NameStep,
  nameAfter,
  reduceName,
} from "./name-editor-state";

export interface NameEditorOptions {
  readonly port: HirobaSessionPort;
  /** The window's lane for Hiroba's pictures: it is held while a write runs. */
  readonly lane: PictureLane;
  /**
   * The profile as the window last read it, which holds the name worn and whether Hiroba takes a
   * change of it: what the field shows and what a review is made against. Null while there is none.
   */
  readonly profile: Pick<ProfileView, "nickname" | "rename"> | null;
  /** The session ended under the section: back to signing in, with what happened. */
  readonly onSessionGone: (notice: MessageKey) => void;
  /**
   * A write read the name back as this, which asks Hiroba nothing more: the window puts it in its
   * copy of the profile.
   */
  readonly onNickname: (nickname: string) => void;
}

/** The Name section as the Name & title page draws and drives it. */
export interface NameEditor {
  readonly step: NameStep;
  /** The name undo this device offers now, if any: asks the platform, never Hiroba. */
  readonly undoable: UndoSummaryOf<"name"> | null;
  /** A save or an undo is on its way: nothing else asks Hiroba anything meanwhile. */
  readonly writing: boolean;
  /** Asks the platform for the undo on offer, as after my page is read. */
  refreshUndo(): Promise<void>;
  /** The session is over, or another one begins: nothing of the section is kept. */
  forget(): void;
  type(value: string): void;
  review(): void;
  back(): void;
  save(): Promise<void>;
  undo(): Promise<void>;
}

/**
 * The Name section, held above the page so that a field, a review or an outcome outlives a visit to
 * another page and a read of my page. There is nothing to read for it: the name is the one my page
 * showed, which the window holds, and a write's own read-back is put in that copy.
 */
export function useNameEditor({
  port,
  lane,
  profile,
  onSessionGone,
  onNickname,
}: NameEditorOptions): NameEditor {
  const [step, dispatch] = useReducer(reduceName, IDLE);
  /** Bumped when the session ends: what a request begun before it brings back is dropped. */
  const session = useRef(0);
  /** A save or an undo is on its way: one press sends one write. */
  const writing = useRef(false);
  const { undoable, refreshUndo, clearUndo } = useUndoOffer(port, "name", session);

  const forget = useCallback(() => {
    session.current += 1;
    dispatch({ type: "forget" });
    clearUndo();
  }, [clearUndo]);

  /**
   * A write ended, a save or an undo: the page shows it, the name it read back is the window's, and
   * the undo on offer is asked for again. One that found the session gone goes back to signing in.
   */
  const writeEnded = (outcome: WriteOutcomeView<NameState>) => {
    dispatch({ type: "writeEnded", outcome });
    const gone = sessionNoticeOf(outcome);
    if (gone !== null) {
      forget();
      onSessionGone(gone);
      return;
    }

    const nickname = nameAfter(outcome);
    if (nickname !== null) {
      onNickname(nickname);
    }
    void refreshUndo();
  };

  /**
   * Sends one write, a save or an undo: no picture even queues behind it, and a second press while
   * it runs is turned away.
   */
  const sendWrite = async (begin: NameAction, send: () => Promise<WriteOutcomeView<NameState>>) => {
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

    const { expected, target } = step;
    await sendWrite({ type: "saveStarted" }, () => port.changeName({ expected, target }));
  };

  const undo = async () => {
    if ((step.name !== "idle" && step.name !== "done") || writing.current) {
      return;
    }

    await sendWrite({ type: "undoStarted" }, () => port.undo("name"));
  };

  return {
    step,
    undoable,
    writing: isWritingName(step),
    refreshUndo,
    forget,
    type: (value) => dispatch({ type: "typed", value }),
    review: () => {
      if (profile !== null) {
        dispatch({
          type: "review",
          worn: { nickname: profile.nickname, rename: profile.rename },
        });
      }
    },
    back: () => dispatch({ type: "back" }),
    save,
    undo,
  };
}
