import type { Result } from "@abth/core";
import type { MessageKey } from "@abth/i18n";
import { useCallback, useState } from "react";

import { afterRefresh } from "../read-again/after-refresh";
import { hirobaSession } from "../shared/read-failure-message";
import type { ReadStatus } from "../shared/reads/read-run";
import { useReadRun } from "../shared/reads/use-read-run";
import type {
  HirobaSessionPort,
  PlayedChart,
  ScoresFailure,
  ScoresProgress,
  ScoresRead,
  ScoresView,
  ScoreView,
} from "../shared/session-port";
import { useHeldCopy } from "../shared/use-held-copy";

/** The song a read of one song is for, named as its reading text names it. */
export type ChosenSong = Pick<ScoreView, "songNo" | "songTitle">;

export interface ScoresState {
  /** The kept scores; null until `load` has brought them. */
  readonly view: ScoresView | null;
  /** Where the read stands, its progress how far a read of all scores has come. */
  readonly status: ReadStatus<ScoresFailure, ScoresProgress>;
  readonly reading: boolean;
  readonly canRead: boolean;
  /** How far a read of all scores has come, while one runs. */
  readonly progress: ScoresProgress | null;
  /** The song whose scores are being read again by hand. */
  readonly song: ChosenSong | null;
  readonly failure: ScoresFailure | null;
  /** The last read of all scores found no chart played since the one before. */
  readonly nothingNew: boolean;
  /** Brings the kept scores unless they are held: the page asks as it opens. */
  readonly load: () => void;
  /** The kept scores changed by another read, such as a walk of the recent plays. */
  readonly markStale: () => void;
  /** Drops the scores held, and a read on its way, for another player's session. */
  readonly forget: () => void;
  /** Reads what the book needs, after Hiroba's own refresh. A second ask while one runs does nothing. */
  readonly read: () => Promise<void>;
  /** Reads every list and every played chart again, after Hiroba's own refresh: minutes. */
  readonly readEvery: () => Promise<void>;
  /** Reads one song's charts again, `played` among them, after Hiroba's own refresh. */
  readonly readSong: (song: ChosenSong, played?: PlayedChart) => Promise<void>;
}

/** The kept scores, a read that reports how far it has come, and a read of one song. */
export function useScores(
  port: Pick<
    HirobaSessionPort,
    | "refreshHiroba"
    | "scores"
    | "readScores"
    | "readEveryScore"
    | "readSongScores"
    | "scoresProgress"
  >,
  onSessionGone: (notice: MessageKey) => void,
): ScoresState {
  const kept = useHeldCopy(useCallback(() => port.scores(), [port]));
  const { load: loadKept, hold, forget: forgetKept } = kept;
  const [reads, status] = useReadRun<ScoresFailure, ScoresProgress>(hirobaSession(onSessionGone));
  const [song, setSong] = useState<ChosenSong | null>(null);
  const [nothingNew, setNothingNew] = useState(false);
  const load = useCallback(() => {
    reads.settle();
    setNothingNew(false);
    loadKept();
  }, [reads, loadKept]);
  const forget = useCallback(() => {
    reads.forget();
    forgetKept();
  }, [reads, forgetKept]);
  const run = useCallback(
    async (ask: () => Promise<Result<ScoresRead, ScoresFailure>>, chosen: ChosenSong | null) => {
      if (reads.status().phase === "reading") {
        return;
      }
      setSong(chosen);
      setNothingNew(false);
      await reads.run(() => afterRefresh(port, ask), {
        ...(chosen === null && { progress: () => port.scoresProgress() }),
        // A read that stopped kept what it read: the page shows that, with where it stopped.
        keep: async (result) => {
          setNothingNew(chosen === null && result.ok && result.value.detailed === 0);
          hold(result.ok ? result.value : await port.scores());
        },
      });
      setSong(null);
    },
    [reads, port, hold],
  );
  const read = useCallback(() => run(() => port.readScores(), null), [port, run]);
  const readEvery = useCallback(() => run(() => port.readEveryScore(), null), [port, run]);
  const readSong = useCallback(
    (chosen: ChosenSong, played?: PlayedChart) =>
      run(() => port.readSongScores(chosen.songNo, played ?? null), chosen),
    [port, run],
  );
  return {
    view: kept.value,
    status,
    reading: status.phase === "reading",
    canRead: status.phase !== "reading",
    progress: status.progress,
    song,
    failure: status.failure,
    nothingNew,
    load,
    markStale: kept.markStale,
    forget,
    read,
    readEvery,
    readSong,
  };
}
