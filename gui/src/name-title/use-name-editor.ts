import type { MessageKey } from "@abth/i18n";
import { useCallback, useReducer, useRef } from "react";

import { sendHeld, sessionNoticeOf } from "../my-page/write-ending";
import type { PictureLane } from "../pictures/picture-lane";
import type { HirobaSessionPort, NameState, ProfileView, WriteOutcomeView } from "../session-port";
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
  type(value: string): void;
  save(): Promise<void>;
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

  const forget = useCallback(() => {
    sessionGeneration.current += 1;
    dispatch({ type: "forget" });
  }, []);

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
    if (step.name !== "idle" || profile === null || writing.current) {
      return;
    }

    const expected = { nickname: profile.nickname };
    const verdict = judgeName(step.typed, { ...expected, rename: profile.rename });
    if (verdict.kind !== "ok") {
      return;
    }

    writing.current = true;
    const mine = sessionGeneration.current;
    dispatch({ type: "saveStarted" });
    const outcome = await sendHeld(lane, () =>
      port.changeName({ expected, target: verdict.target }),
    );
    writing.current = false;
    if (mine === sessionGeneration.current) {
      writeEnded(outcome);
    }
  };

  return {
    step,
    writing: isWritingName(step),
    forget,
    type: (value) => dispatch({ type: "typed", value }),
    save,
  };
}
