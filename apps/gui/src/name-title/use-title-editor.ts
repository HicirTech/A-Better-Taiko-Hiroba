import type { TitleOption } from "@abth/core";
import type { MessageKey } from "@abth/i18n";
import { useCallback, useReducer, useRef } from "react";

import { seenAfter, sendHeld, sessionNoticeOf } from "../my-page/write-ending";
import type { PictureLane } from "../pictures/picture-lane";
import { FAILURE_MESSAGE, SESSION_GONE } from "../read-failure-message";
import type { HirobaSessionPort, ProfileView, TitleState, WriteOutcomeView } from "../session-port";
import {
  changesTitle,
  IDLE,
  isWritingTitle,
  mayReadTitles,
  movedTheTitle,
  reduceTitle,
  type TitleStep,
} from "./title-editor-state";

export interface TitleEditorOptions {
  readonly port: HirobaSessionPort;
  readonly lane: PictureLane;
  /** The profile as the window last read it: the title worn, which a save is made against. */
  readonly profile: Pick<ProfileView, "title"> | null;
  readonly onSessionGone: (notice: MessageKey) => void;
  /** A write read the title back as this: the window puts it in its copy of the profile. */
  readonly onTitle: (title: string) => void;
  /** A write left the title moved, or maybe moved: the window reads my page again for the plate. */
  readonly onMoved: () => void;
}

export interface TitleEditor {
  readonly step: TitleStep;
  readonly writing: boolean;
  /** Reads the titles to choose from when the picker opens; none if they are read already. */
  readList(): Promise<void>;
  /** Drops the list, and what the last write said, when my page is read again. */
  forgetList(): void;
  /** Drops everything of the section when a session ends or begins. */
  forget(): void;
  pick(option: TitleOption | null): void;
  save(): Promise<void>;
}

export function useTitleEditor({
  port,
  lane,
  profile,
  onSessionGone,
  onTitle,
  onMoved,
}: TitleEditorOptions): TitleEditor {
  const [step, dispatch] = useReducer(reduceTitle, IDLE);
  // An answer on its way is let go when a session ends, the list is forgotten or a write ends.
  const generation = useRef(0);
  // One read at a time, also when the picker opens twice before the page draws.
  const reading = useRef<number | null>(null);
  const writing = useRef(false);

  const forget = useCallback(() => {
    generation.current += 1;
    dispatch({ type: "forget" });
  }, []);

  const forgetList = useCallback(() => {
    generation.current += 1;
    dispatch({ type: "listForgotten" });
  }, []);

  const mayRead = mayReadTitles(step);
  const readList = useCallback(async () => {
    const mine = generation.current;
    if (!mayRead || reading.current === mine || writing.current) {
      return;
    }

    reading.current = mine;
    dispatch({ type: "readStarted" });
    const result = await port.openTitleEditor();
    if (reading.current === mine) {
      reading.current = null;
    }
    if (mine !== generation.current) {
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
    generation.current += 1;
    dispatch({ type: "writeEnded", outcome });
    const gone = sessionNoticeOf(outcome);
    if (gone !== null) {
      forget();
      onSessionGone(gone);
      return;
    }

    const seen = seenAfter(outcome);
    if (seen !== null) {
      onTitle(seen.title);
    }
    if (movedTheTitle(outcome)) {
      onMoved();
    }
  };

  const save = async () => {
    const picked = step.picked;
    if (
      step.name !== "idle" ||
      profile === null ||
      picked === null ||
      !changesTitle(profile.title, picked) ||
      writing.current
    ) {
      return;
    }

    const expected = { title: profile.title };
    writing.current = true;
    const mine = generation.current;
    dispatch({ type: "saveStarted" });
    const outcome = await sendHeld(lane, () =>
      port.changeTitle({ expected, target: { id: picked.id, title: picked.label } }),
    );
    writing.current = false;
    if (mine === generation.current) {
      writeEnded(outcome);
    }
  };

  return {
    step,
    writing: isWritingTitle(step),
    readList,
    forgetList,
    forget,
    pick: (option) => dispatch({ type: "picked", option }),
    save,
  };
}
