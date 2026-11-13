import { describe, expect, mock, test } from "bun:test";
import { ok } from "@abth/core";
import { act, renderHook } from "@testing-library/react/pure";

import { UNREAD } from "../src/favorites/favorites-state";
import { useFavorites } from "../src/favorites/use-favorites";
import type {
  FavoriteSongState,
  FavoritesView,
  FolderHistoryEntry,
  FolderNames,
  FolderState,
  WriteOutcomeView,
} from "../src/shared/session-port";
import { inADocument } from "./document";
import { answeredByHand, counted, portAnswering, writeLane } from "./write-fakes";

inADocument();

const SONGS = ["1001", "1002"];
const VIEW: FavoritesView = {
  folder: {
    state: { slots: [...SONGS, ...Array.from({ length: 28 }, () => null)] },
    songs: SONGS.map((songNo) => ({ songNo, title: `曲${songNo}`, genre: 1 })),
  },
  song: {
    state: { songNo: "1001", ura: false },
    song: { songNo: "1001", title: "曲1001", genre: 1 },
  },
};
const PICKED: FavoriteSongState = { songNo: "1002", ura: false };
const KEPT: FolderHistoryEntry = { songs: SONGS, keptAt: 1, setName: null };
const SESSION_GONE: WriteOutcomeView<FavoriteSongState> = {
  kind: "sessionGone",
  writeMayHaveHappened: false,
};
const NOT_SIGNED_IN: WriteOutcomeView<FavoriteSongState> = { kind: "notSignedIn" };
const BUSY: WriteOutcomeView<FavoriteSongState> = { kind: "busy" };
const NAMES: FolderNames = { expected: null, target: null };

/** The Favourites page on a port whose writes wait for the test's answers. */
function favoritesPage() {
  const changeFavoriteSong = answeredByHand<WriteOutcomeView<FavoriteSongState>>();
  const changeFolder = answeredByHand<WriteOutcomeView<FolderState>>();
  const openFavorites = counted(ok(VIEW));
  const folderHistory = counted([KEPT]);
  const port = portAnswering({
    changeFavoriteSong: changeFavoriteSong.call,
    changeFolder: changeFolder.call,
    openFavorites: openFavorites.call,
    folderHistory: folderHistory.call,
  });
  const { lane, held } = writeLane();
  const onSessionGone = mock(() => undefined);
  const { result } = renderHook(() => useFavorites({ port, lane, onSessionGone }));
  const readThenSave = async () => {
    await act(() => result.current.read());
    act(() => result.current.pickSong(PICKED));
    act(() => {
      void result.current.saveSong();
    });
  };
  return {
    result,
    changeFavoriteSong,
    changeFolder,
    openFavorites,
    folderHistory,
    held,
    onSessionGone,
    readThenSave,
  };
}

describe("the 大好きな曲's write when the session ends on its way", () => {
  test.each([
    ["sessionGone", SESSION_GONE],
    ["notSignedIn", NOT_SIGNED_IN],
  ])("drops the ended session's %s answer, then reads and writes again", async (_kind, late) => {
    const page = favoritesPage();
    await page.readThenSave();
    act(() => page.result.current.forget());

    await act(async () => page.changeFavoriteSong.answer(late));

    expect(page.onSessionGone).not.toHaveBeenCalled();
    expect(page.folderHistory.made()).toBe(1);
    expect(page.result.current.history).toEqual([]);
    expect(page.result.current.step).toEqual(UNREAD);
    expect(page.held()).toBe(0);

    await page.readThenSave();
    expect(page.openFavorites.made()).toBe(2);
    expect(page.changeFavoriteSong.made()).toBe(2);
  });

  test("forgets the page and says why when its write finds the session gone", async () => {
    const page = favoritesPage();
    await page.readThenSave();

    await act(async () => page.changeFavoriteSong.answer(SESSION_GONE));

    expect(page.onSessionGone).toHaveBeenCalledWith("write.sessionGone");
    expect(page.result.current.history).toEqual([]);
    expect(page.result.current.step).toEqual(UNREAD);
    expect(page.held()).toBe(0);
  });
});

describe("the favourites' writes", () => {
  test("send one write when more are asked at once, and replace no folder meanwhile", async () => {
    const page = favoritesPage();
    await act(() => page.result.current.read());
    act(() => page.result.current.pickSong(PICKED));
    act(() => {
      void page.result.current.saveSong();
      void page.result.current.saveSong();
      void page.result.current.applySet(SONGS, NAMES);
    });

    expect(await page.result.current.replaceFolder(SONGS, () => NAMES)).toBeNull();
    expect(page.changeFavoriteSong.made()).toBe(1);
    expect(page.changeFolder.made()).toBe(0);
    expect(page.openFavorites.made()).toBe(1);

    await act(async () => page.changeFavoriteSong.answer(BUSY));
    expect(page.held()).toBe(0);
  });
});
