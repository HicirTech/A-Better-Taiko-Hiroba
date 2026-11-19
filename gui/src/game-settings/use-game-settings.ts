import type { GameSettingKey } from "@abth/core";
import type { PlainMessageKey } from "@abth/i18n";
import { useCallback, useReducer } from "react";
import type { PictureLane } from "../pictures/picture-lane";
import { FAILURE_MESSAGE, SESSION_GONE } from "../shared/read-failure-message";
import { afterRefresh } from "../shared/reads/after-refresh";
import type { ReadStatus } from "../shared/reads/read-run";
import { useReadRun } from "../shared/reads/use-read-run";
import type { HirobaSessionPort, ReadFailure } from "../shared/session-port";
import { useWriteSession } from "../shared/writes/use-write-session";
import { endSessionIfGone } from "../shared/writes/write-ending";
import {
  canReadGameSettingsAgain,
  type GameSettingsStep,
  isWritingGameSettings,
  reduceGameSettings,
  UNREAD,
} from "./game-settings-state";

export interface GameSettingsOptions {
  readonly port: HirobaSessionPort;
  readonly lane: PictureLane;
  readonly onSessionGone: (notice: PlainMessageKey) => void;
}

export interface GameSettingsEditor {
  readonly step: GameSettingsStep;
  /** Where the read of Hiroba's settings page stands. */
  readonly status: ReadStatus<ReadFailure, never>;
  readonly reading: boolean;
  readonly writing: boolean;
  readonly canRead: boolean;
  /** Reads the settings page, after Hiroba's own refresh when `refreshFirst`. */
  read(refreshFirst?: boolean): Promise<void>;
  /** Drops everything of the settings when a session ends or begins. */
  forget(): void;
  /** Puts one setting in the draft, as Hiroba's page takes the pick. */
  pick(key: GameSettingKey, value: string): void;
  /** Sends the draft, every setting in one write. */
  save(): Promise<void>;
  /** Drops the draft, putting every setting back as read. */
  reset(): void;
  /** Drops the draft and the last write's notice when the page is left; what was read stays. */
  dropEdits(): void;
  /** Drops the last write's notice once the window has said it. */
  closeNotice(): void;
}

export function useGameSettings({
  port,
  lane,
  onSessionGone,
}: GameSettingsOptions): GameSettingsEditor {
  const [step, dispatch] = useReducer(reduceGameSettings, UNREAD);
  const session = useWriteSession(lane);
  const [reads, status] = useReadRun<ReadFailure>({
    callFailed: { kind: "callFailed" },
    endsTheSession: (failure) => SESSION_GONE.has(failure.kind),
    onSessionEnded: (failure) => {
      forget();
      onSessionGone(FAILURE_MESSAGE[failure.kind]);
    },
  });

  const forget = useCallback(() => {
    session.bump();
    reads.forget();
    dispatch({ type: "forget" });
  }, [session, reads]);
  const dropEdits = useCallback(() => {
    reads.settle();
    dispatch({ type: "draftDropped" });
  }, [reads]);
  const pick = useCallback(
    (key: GameSettingKey, value: string) => dispatch({ type: "picked", key, value }),
    [],
  );

  const mayRead = step.name === "unread" || canReadGameSettingsAgain(step);
  const read = useCallback(
    async (refreshFirst?: boolean) => {
      // One read at a time, also under StrictMode's double effects, which would ask Hiroba twice.
      if (!mayRead || session.writing() || reads.status().phase === "reading") {
        return;
      }

      dispatch({ type: "readStarted" });
      const open = () => port.openGameSettings();
      await reads.run(() => (refreshFirst ? afterRefresh(port, open) : open()), {
        keep: (result) => dispatch({ type: "readEnded", result }),
      });
    },
    [mayRead, session, reads, port],
  );

  const save = async () => {
    if (step.name !== "ready" || step.draft === null || session.writing()) {
      return;
    }

    const expected = step.view.state;
    const target = step.draft;
    dispatch({ type: "saveStarted" });
    const outcome = await session.send(() => port.changeGameSettings({ expected, target }));
    if (outcome === null) {
      return;
    }

    dispatch({ type: "written", outcome });
    endSessionIfGone(outcome, forget, onSessionGone);
  };

  return {
    step,
    status,
    reading: step.name === "loading",
    writing: isWritingGameSettings(step),
    canRead: canReadGameSettingsAgain(step),
    read,
    forget,
    pick,
    save,
    reset: () => dispatch({ type: "draftDropped" }),
    dropEdits,
    closeNotice: () => dispatch({ type: "noticeClosed" }),
  };
}
