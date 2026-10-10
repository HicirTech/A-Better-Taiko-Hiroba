import type { Result } from "@abth/core";
import type { MessageKey } from "@abth/i18n";
import { useCallback, useRef, useState } from "react";

import { afterRefresh } from "../read-again/after-refresh";
import { FAILURE_MESSAGE, SESSION_GONE } from "../read-failure-message";
import type {
  HirobaSessionPort,
  ScoresFailure,
  ScoresProgress,
  ScoresView,
  ScoreView,
} from "../session-port";

const POLL_MS = 200;

export interface ScoresState {
  /** The kept scores; null until `load` has brought them. */
  readonly view: ScoresView | null;
  readonly reading: boolean;
  readonly canRead: boolean;
  /** How far a read of all scores has come, while one runs. */
  readonly progress: ScoresProgress | null;
  /** The song whose scores are being read again by hand. */
  readonly song: ScoreView | null;
  readonly failure: ScoresFailure | null;
  /** Brings the kept scores: the page asks as it opens. */
  readonly load: () => void;
  /** Reads what the book needs, after Hiroba's own refresh. A second ask while one runs does nothing. */
  readonly read: () => Promise<void>;
  /** Reads one song's charts again, after Hiroba's own refresh. */
  readonly readSong: (song: ScoreView) => Promise<void>;
}

/** The kept scores, a read that reports how far it has come, and a read of one song. */
export function useScores(
  port: Pick<
    HirobaSessionPort,
    "refreshHiroba" | "scores" | "readScores" | "readSongScores" | "scoresProgress"
  >,
  onSessionGone: (notice: MessageKey) => void,
): ScoresState {
  const [view, setView] = useState<ScoresView | null>(null);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState<ScoresProgress | null>(null);
  const [song, setSong] = useState<ScoreView | null>(null);
  const [failure, setFailure] = useState<ScoresFailure | null>(null);
  const running = useRef(false);
  const load = useCallback(() => {
    setView(null);
    setFailure(null);
    void port.scores().then(setView);
  }, [port]);
  // A read that stopped kept what it read: the page shows that, with where it stopped.
  const settle = useCallback(
    async (result: Result<ScoresView, ScoresFailure>) => {
      if (result.ok) {
        setView(result.value);
      } else if (SESSION_GONE.has(result.error.kind)) {
        onSessionGone(FAILURE_MESSAGE[result.error.kind]);
      } else {
        setFailure(result.error);
        setView(await port.scores());
      }
    },
    [port, onSessionGone],
  );
  const run = useCallback(
    async (ask: () => Promise<Result<ScoresView, ScoresFailure>>, chosen: ScoreView | null) => {
      if (running.current) {
        return;
      }
      running.current = true;
      setReading(true);
      setSong(chosen);
      setFailure(null);
      const poll =
        chosen === null
          ? setInterval(() => {
              void port.scoresProgress().then((now) => {
                if (running.current) {
                  setProgress(now);
                }
              });
            }, POLL_MS)
          : undefined;
      try {
        await settle(await afterRefresh(port, ask));
      } finally {
        clearInterval(poll);
        running.current = false;
        setReading(false);
        setProgress(null);
        setSong(null);
      }
    },
    [port, settle],
  );
  const read = useCallback(() => run(() => port.readScores(), null), [port, run]);
  const readSong = useCallback(
    (chosen: ScoreView) => run(() => port.readSongScores(chosen.songNo), chosen),
    [port, run],
  );
  return { view, reading, canRead: !reading, progress, song, failure, load, read, readSong };
}
