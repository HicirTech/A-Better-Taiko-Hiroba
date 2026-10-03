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
  readonly lane: PictureLane;
  /** The profile as the window last read it: what the field shows and a review is made against. */
  readonly profile: Pick<ProfileView, "nickname" | "rename"> | null;
  readonly onSessionGone: (notice: MessageKey) => void;
  /** A write read the name back as this: the window puts it in its copy of the profile. */
  readonly onNickname: (nickname: string) => void;
}

export interface NameEditor {
  readonly step: NameStep;
  /** The undo this device offers now, if any; from the platform, never Hiroba. */
  readonly undoable: UndoSummaryOf<"name"> | null;
  readonly writing: boolean;
  refreshUndo(): Promise<void>;
  /** Drops everything of the section when a session ends or begins. */
  forget(): void;
  type(value: string): void;
  review(): void;
  back(): void;
  save(): Promise<void>;
  undo(): Promise<void>;
}

export function useNameEditor({
  port,
  lane,
  profile,
  onSessionGone,
  onNickname,
}: NameEditorOptions): NameEditor {
  const [step, dispatch] = useReducer(reduceName, IDLE);
  const sessionGeneration = useRef(0);
  const writing = useRef(false);
  const { undoable, refreshUndo, clearUndo } = useUndoOffer(port, "name", sessionGeneration);

  const forget = useCallback(() => {
    sessionGeneration.current += 1;
    dispatch({ type: "forget" });
    clearUndo();
  }, [clearUndo]);

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

  const sendWrite = async (begin: NameAction, send: () => Promise<WriteOutcomeView<NameState>>) => {
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
