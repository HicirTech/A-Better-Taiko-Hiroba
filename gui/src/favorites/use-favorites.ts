import type { MessageKey } from "@abth/i18n";
import { useCallback, useReducer, useRef } from "react";
import type { PictureLane } from "../pictures/picture-lane";
import { FAILURE_MESSAGE, SESSION_GONE } from "../shared/read-failure-message";
import { afterRefresh } from "../shared/reads/after-refresh";
import { type ReadStatus, readsIdle } from "../shared/reads/read-run";
import { useReadRun } from "../shared/reads/use-read-run";
import type {
  FavoriteSongState,
  FolderHistoryEntry,
  FolderNames,
  FolderState,
  HirobaSessionPort,
  ReadFailure,
  WriteOutcomeView,
} from "../shared/session-port";
import { useKeptHistory } from "../shared/use-kept-history";
import { sendHeld, sessionNoticeOf } from "../shared/writes/write-ending";
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
  /** Where the read of the two editors stands. */
  readonly status: ReadStatus<ReadFailure, never>;
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
  /** The folders this device kept of the player's, newest first. */
  readonly history: readonly FolderHistoryEntry[];
  /** Writes the folder with these songs in its first slots and the rest empty; `names` are kept. */
  applySet(songs: readonly string[], names: FolderNames): Promise<void>;
  /** The same from any page, reading the folder again first; how the write ended. */
  replaceFolder(
    songs: readonly string[],
    names: (replaced: FolderState) => FolderNames,
  ): Promise<WriteOutcomeView<FolderState> | null>;
  /** Drops the draft and the last write's notice when the page is left; what was read stays. */
  dropEdits(): void;
  /** Drops the last write's notice once the window has said it. */
  closeNotice(): void;
}

export function useFavorites({ port, lane, onSessionGone }: FavoritesOptions): FavoritesEditor {
  const [step, dispatch] = useReducer(reduceFavorites, UNREAD);
  const generation = useRef(0);
  const writing = useRef(false);
  const readHistory = useCallback(() => port.folderHistory(), [port]);
  const { history, refreshHistory, clearHistory } = useKeptHistory(readHistory, generation);
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
    clearHistory();
    dispatch({ type: "forget" });
  }, [reads, clearHistory]);
  const dropEdits = useCallback(() => {
    reads.settle();
    dispatch({ type: "draftDropped" });
  }, [reads]);
  const pickSong = useCallback(
    (song: FavoriteSongState) => dispatch({ type: "songPicked", song }),
    [],
  );

  const mayRead = step.name === "unread" || canReadFavoritesAgain(step);
  const read = useCallback(
    async (refreshFirst?: boolean) => {
      // One read at a time, also under StrictMode's double effects, which would ask Hiroba twice.
      if (!mayRead || writing.current || reads.status().phase === "reading") {
        return;
      }

      dispatch({ type: "readStarted" });
      const open = () => port.openFavorites();
      await reads.run(() => (refreshFirst ? afterRefresh(port, open) : open()), {
        keep: (result) => dispatch({ type: "readEnded", result }),
      });
      await refreshHistory();
    },
    [mayRead, reads, port, refreshHistory],
  );

  const write = async <S>(
    kind: SavingWrite,
    send: () => Promise<WriteOutcomeView<S>>,
    ended: (outcome: WriteOutcomeView<S>) => FavoritesAction,
  ): Promise<WriteOutcomeView<S> | null> => {
    writing.current = true;
    const mine = generation.current;
    dispatch({ type: "saveStarted", write: kind });
    const outcome = await sendHeld(lane, send);
    writing.current = false;
    if (mine !== generation.current) {
      return null;
    }

    dispatch(ended(outcome));
    const gone = sessionNoticeOf(outcome);
    if (gone !== null) {
      forget();
      onSessionGone(gone);
    }
    return outcome;
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

  const applySet = async (songs: readonly string[], names: FolderNames) => {
    if (step.name !== "ready" || writing.current) {
      return;
    }

    const { view } = step;
    await write(
      "folder",
      () => port.changeFolder({ expected: view.folder.state, target: songs, names }),
      (outcome) => ({ type: "folderWritten", outcome }),
    );
    void refreshHistory();
  };

  const replaceFolder = async (
    songs: readonly string[],
    names: (replaced: FolderState) => FolderNames,
  ) => {
    if (writing.current) {
      return null;
    }

    // Read now, whatever was read before: the folder is replaced as it stands on Hiroba, and a read
    // on its way, such as the Favourites page's first, ends before this one starts.
    await readsIdle(reads);
    dispatch({ type: "readStarted" });
    const read = await reads.run(() => port.openFavorites(), {
      keep: (result) => dispatch({ type: "readEnded", result }),
    });
    if (read === null || !read.ok) {
      return null;
    }
    const expected = read.value.folder.state;
    const outcome = await write(
      "folder",
      () => port.changeFolder({ expected, target: songs, names: names(expected) }),
      (ended) => ({ type: "folderWritten", outcome: ended }),
    );
    void refreshHistory();
    return outcome;
  };

  return {
    step,
    status,
    reading: step.name === "loading",
    writing: isWritingFavorites(step),
    canRead: canReadFavoritesAgain(step),
    read,
    forget,
    pickSong,
    saveSong,
    resetSong: () => dispatch({ type: "draftDropped" }),
    history,
    applySet,
    replaceFolder,
    dropEdits,
    closeNotice: () => dispatch({ type: "noticeClosed" }),
  };
}
