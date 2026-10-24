import type { TitleOption } from "@abth/core";
import type { MessageKey } from "@abth/i18n";
import { useCallback, useReducer, useRef } from "react";
import type { PictureLane } from "../pictures/picture-lane";
import { FAILURE_MESSAGE, SESSION_GONE } from "../shared/read-failure-message";
import type { ReadStatus } from "../shared/reads/read-run";
import { useReadRun } from "../shared/reads/use-read-run";
import type {
  HirobaSessionPort,
  ProfileView,
  ReadFailure,
  TitleState,
  WriteOutcomeView,
} from "../shared/session-port";
import { noticeOf, seenAfter, sendHeld, sessionNoticeOf } from "../shared/writes/write-ending";
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
  /** Where the read of the titles to choose from stands. */
  readonly status: ReadStatus<ReadFailure, never>;
  readonly writing: boolean;
  /** Reads the titles to choose from when the picker opens; none if they are read already. */
  readList(): Promise<void>;
  /** Drops the list, and what the last write said, when my page is read again. */
  forgetList(): void;
  /** Drops everything of the section when a session ends or begins. */
  forget(): void;
  /** Drops the pick and the last write's notice when the page is left; the list stays. */
  dropEdits(): void;
  pick(option: TitleOption | null): void;
  /** Drops the last write's notice once the window has said it. */
  closeNotice(): void;
  /** Sends the pick: true once Hiroba has taken it, or held it already. */
  save(): Promise<boolean>;
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
    generation.current += 1;
    reads.forget();
    dispatch({ type: "forget" });
  }, [reads]);

  const dropEdits = useCallback(() => dispatch({ type: "editsDropped" }), []);

  const forgetList = useCallback(() => {
    generation.current += 1;
    reads.forget();
    dispatch({ type: "listForgotten" });
  }, [reads]);

  const mayRead = mayReadTitles(step);
  const readList = useCallback(async () => {
    // One read at a time, also when the picker opens twice before the page draws.
    if (!mayRead || writing.current || reads.status().phase === "reading") {
      return;
    }

    dispatch({ type: "readStarted" });
    await reads.run(() => port.openTitleEditor(), {
      keep: (result) => dispatch({ type: "readEnded", result }),
    });
  }, [mayRead, reads, port]);

  const writeEnded = (outcome: WriteOutcomeView<TitleState>) => {
    generation.current += 1;
    if (reads.status().phase === "reading") {
      reads.forget();
    }
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
      return false;
    }

    const expected = { title: profile.title };
    writing.current = true;
    const mine = generation.current;
    dispatch({ type: "saveStarted" });
    const outcome = await sendHeld(lane, () =>
      port.changeTitle({ expected, target: { id: picked.id, title: picked.label } }),
    );
    writing.current = false;
    const current = mine === generation.current;
    if (current) {
      writeEnded(outcome);
    }
    return current && noticeOf(outcome) === null;
  };

  return {
    step,
    status,
    writing: isWritingTitle(step),
    readList,
    forgetList,
    forget,
    dropEdits,
    pick: (option) => dispatch({ type: "picked", option }),
    closeNotice: () => dispatch({ type: "noticeClosed" }),
    save,
  };
}
