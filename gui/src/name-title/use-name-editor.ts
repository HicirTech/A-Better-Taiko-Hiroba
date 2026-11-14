import type { MessageKey } from "@abth/i18n";
import { useCallback, useReducer } from "react";
import type { PictureLane } from "../pictures/picture-lane";
import type {
  HirobaSessionPort,
  NameState,
  ProfileView,
  WriteOutcomeView,
} from "../shared/session-port";
import { useWriteSession } from "../shared/writes/use-write-session";
import { noticeOf, sessionNoticeOf } from "../shared/writes/write-ending";
import {
  IDLE,
  isWritingName,
  judgeName,
  type NameStep,
  nameAfter,
  reduceName,
} from "./name-editor-state";

export interface NameEditorOptions {
  readonly port: HirobaSessionPort;
  readonly lane: PictureLane;
  /** The profile as the window last read it: what the field shows and a save is made against. */
  readonly profile: Pick<ProfileView, "nickname" | "rename"> | null;
  readonly onSessionGone: (notice: MessageKey) => void;
  /** A write read the name back as this: the window puts it in its copy of the profile. */
  readonly onNickname: (nickname: string) => void;
}

export interface NameEditor {
  readonly step: NameStep;
  readonly writing: boolean;
  /** Drops everything of the section when a session ends or begins. */
  forget(): void;
  /** Drops the typed nickname and the last write's notice when the page is left. */
  dropEdits(): void;
  type(value: string): void;
  /** Drops the last write's notice once the window has said it. */
  closeNotice(): void;
  /** Sends the nickname typed: true once Hiroba has taken it, or held it already. */
  save(): Promise<boolean>;
}

export function useNameEditor({
  port,
  lane,
  profile,
  onSessionGone,
  onNickname,
}: NameEditorOptions): NameEditor {
  const [step, dispatch] = useReducer(reduceName, IDLE);
  const session = useWriteSession(lane);

  const forget = useCallback(() => {
    session.bump();
    dispatch({ type: "forget" });
  }, [session]);

  const dropEdits = useCallback(() => dispatch({ type: "editsDropped" }), []);

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
  };

  const save = async () => {
    if (step.name !== "idle" || profile === null || session.writing()) {
      return false;
    }

    const expected = { nickname: profile.nickname };
    const verdict = judgeName(step.typed, { ...expected, rename: profile.rename });
    if (verdict.kind !== "ok") {
      return false;
    }

    dispatch({ type: "saveStarted" });
    const outcome = await session.send(() => port.changeName({ expected, target: verdict.target }));
    if (outcome !== null) {
      writeEnded(outcome);
    }
    return outcome !== null && noticeOf(outcome) === null;
  };

  return {
    step,
    writing: isWritingName(step),
    forget,
    dropEdits,
    type: (value) => dispatch({ type: "typed", value }),
    closeNotice: () => dispatch({ type: "noticeClosed" }),
    save,
  };
}
