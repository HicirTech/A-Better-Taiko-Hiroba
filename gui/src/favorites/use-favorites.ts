import type { MessageKey } from "@abth/i18n";
import { useCallback, useReducer, useRef } from "react";

import { sendHeld, sessionNoticeOf } from "../my-page/write-ending";
import type { PictureLane } from "../pictures/picture-lane";
import { afterRefresh } from "../read-again/after-refresh";
import { FAILURE_MESSAGE, SESSION_GONE } from "../read-failure-message";
import type { FavoriteSongState, HirobaSessionPort, WriteOutcomeView } from "../session-port";
import {
  canReadFavoritesAgain,
  type FavoritesAction,
  type FavoritesStep,
  isWritingFavorites,
  reduceFavorites,
  type SavingWrite,
  UNREAD,
} from "./favorites-state";

export interface FavoritesOptions {
  readonly port: HirobaSessionPort;
  readonly lane: PictureLane;
  readonly onSessionGone: (notice: MessageKey) => void;
}

export interface FavoritesEditor {
  readonly step: FavoritesStep;
  readonly reading: boolean;
  readonly writing: boolean;
  readonly canRead: boolean;
  /** Reads the two editors, after Hiroba's own refresh when `refreshFirst`. */
  read(refreshFirst?: boolean): Promise<void>;
  /** Drops everything of the favourites when a session ends or begins. */
  forget(): void;
  /** Puts a song in the draft for the 大好きな曲. */
  pickSong(song: FavoriteSongState): void;
  saveSong(): Promise<void>;
  /** Drops the draft, putting the row back to the song set. */
  resetSong(): void;
  /** Writes the folder with these songs in its first slots and the rest empty. */
  applySet(songs: readonly string[]): Promise<void>;
  /** Drops the draft and the last write's notice when the page is left; what was read stays. */
  dropEdits(): void;
}

export function useFavorites({ port, lane, onSessionGone }: FavoritesOptions): FavoritesEditor {
  const [step, dispatch] = useReducer(reduceFavorites, UNREAD);
  const generation = useRef(0);
  // One read at a time, also under StrictMode's double effects, which would ask Hiroba twice.
  const reading = useRef<number | null>(null);
  const writing = useRef(false);

  const forget = useCallback(() => {
    generation.current += 1;
    dispatch({ type: "forget" });
  }, []);
  const dropEdits = useCallback(() => dispatch({ type: "draftDropped" }), []);
  const pickSong = useCallback(
    (song: FavoriteSongState) => dispatch({ type: "songPicked", song }),
    [],
  );

  const mayRead = step.name === "unread" || canReadFavoritesAgain(step);
  const read = useCallback(
    async (refreshFirst?: boolean) => {
      const mine = generation.current;
      if (!mayRead || reading.current === mine || writing.current) {
        return;
      }

      reading.current = mine;
      dispatch({ type: "readStarted" });
      const open = () => port.openFavorites();
      const result = await (refreshFirst ? afterRefresh(port, open) : open());
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
    },
    [mayRead, port, forget, onSessionGone],
  );

  const write = async <S>(
    kind: SavingWrite,
    send: () => Promise<WriteOutcomeView<S>>,
    ended: (outcome: WriteOutcomeView<S>) => FavoritesAction,
  ) => {
    writing.current = true;
    const mine = generation.current;
    dispatch({ type: "saveStarted", write: kind });
    const outcome = await sendHeld(lane, send);
    writing.current = false;
    if (mine !== generation.current) {
      return;
    }

    dispatch(ended(outcome));
    const gone = sessionNoticeOf(outcome);
    if (gone !== null) {
      forget();
      onSessionGone(gone);
    }
  };

  const saveSong = async () => {
    if (step.name !== "ready" || step.draft === null || writing.current) {
      return;
    }

    const { view, draft } = step;
    await write(
      "favoriteSong",
      () => port.changeFavoriteSong({ expected: view.song.state, target: draft }),
      (outcome) => ({ type: "songWritten", outcome }),
    );
  };

  const applySet = async (songs: readonly string[]) => {
    if (step.name !== "ready" || writing.current) {
      return;
    }

    const { view } = step;
    await write(
      "folder",
      () => port.changeFolder({ expected: view.folder.state, target: songs }),
      (outcome) => ({ type: "folderWritten", outcome }),
    );
  };

  return {
    step,
    reading: step.name === "loading",
    writing: isWritingFavorites(step),
    canRead: canReadFavoritesAgain(step),
    read,
    forget,
    pickSong,
    saveSong,
    resetSong: dropEdits,
    applySet,
    dropEdits,
  };
}
