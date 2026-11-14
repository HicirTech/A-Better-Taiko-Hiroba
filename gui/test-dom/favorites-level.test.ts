import { afterEach, describe, expect, mock, setSystemTime, test } from "bun:test";
import { act, renderHook } from "@testing-library/react/pure";
import { createElement, type ReactNode, useState } from "react";

import type { GiftDraft } from "../src/favorites/gift-maker";
import { type FavoritesScene, useFavoritesLevel } from "../src/favorites/use-favorites-level";
import { useGiftDraft } from "../src/favorites/use-gift-draft";
import { useSetEdit } from "../src/favorites/use-set-edit";
import { GIFT_SONG_LIMIT } from "../src/shared/gifts/gift-code";
import type { FolderHistoryEntry } from "../src/shared/session-port";
import { type FavoriteSet, SET_SONG_LIMIT } from "../src/shared/sets/favorite-sets";
import type { ListedSong } from "../src/shared/song-catalogue/use-song-catalogue";
import { BackModesContext, createBackClosers } from "../src/ui/back-closers";
import { song } from "../test/song-fixtures";
import { inADocument } from "./document";

inADocument();

const FIRST: FavoriteSet = { id: "first", name: "First", songs: ["1001", "1002"] };
const SECOND: FavoriteSet = { id: "second", name: "Second", songs: ["1003"] };
const KEPT: FolderHistoryEntry = { songs: ["1004"], keptAt: 1, setName: null };
const GIFT: GiftDraft = { songs: ["1001"], title: "", shown: true, madeAt: 1 };
const listed = (songNo: string): ListedSong => ({ ...song({ songNo }), chineseNames: [] });

function favoritesLevel(tipScene: FavoritesScene = null) {
  const back = createBackClosers();
  const onDrawer = mock((_open: boolean) => undefined);
  const wrapper = ({ children }: { readonly children: ReactNode }) =>
    createElement(BackModesContext.Provider, { value: back }, children);
  const { result, rerender } = renderHook(
    ({ scene, sets }: { scene: FavoritesScene; sets: readonly FavoriteSet[] }) =>
      useFavoritesLevel({ sets, tipScene: scene, onDrawer }),
    { wrapper, initialProps: { scene: tipScene, sets: [FIRST, SECOND] } },
  );
  return { result, rerender, back, onDrawer };
}

describe("the Favourites page's level", () => {
  test("shows a set with nothing else of the page held", () => {
    const { result } = favoritesLevel();
    act(() => result.current.setPutBack(KEPT));
    act(() => result.current.setGift(GIFT));
    act(() => result.current.setDraft(["1003"]));

    act(() => result.current.showSet("second"));

    expect(result.current.set).toBe(SECOND);
    expect(result.current.putBack).toBeNull();
    expect(result.current.gift).toBeNull();
    expect(result.current.draft).toBeNull();
    expect(result.current.editing).toBe(false);
  });

  test("leaves a set's edits on Back before the set, then shows the favourites", () => {
    const { result, back } = favoritesLevel();
    act(() => result.current.showSet("first", true));
    act(() => result.current.setDraft(["1003"]));
    expect(result.current.editing).toBe(true);

    act(() => back.closeLatest());
    expect(result.current.editing).toBe(false);
    expect(result.current.draft).toBeNull();
    expect(result.current.set).toBe(FIRST);

    act(() => back.closeLatest());
    expect(result.current.set).toBeNull();
    expect(back.isOpen()).toBe(false);
  });

  test("edits the set shown on Edit", () => {
    const { result } = favoritesLevel();
    act(() => result.current.showSet("first"));
    expect(result.current.editing).toBe(false);

    act(() => result.current.edit());

    expect(result.current.editing).toBe(true);
  });

  test("leaves a folder put back and a gift on Back", () => {
    const { result, back } = favoritesLevel();
    act(() => result.current.setPutBack(KEPT));
    act(() => back.closeLatest());
    expect(result.current.putBack).toBeNull();

    act(() => result.current.setGift(GIFT));
    act(() => back.closeLatest());
    expect(result.current.gift).toBeNull();
    expect(back.isOpen()).toBe(false);
  });

  test("shows the favourites once the set shown leaves the list", () => {
    const { result, rerender } = favoritesLevel();
    act(() => result.current.showSet("first"));

    rerender({ scene: null, sets: [SECOND] });

    expect(result.current.set).toBeNull();
  });

  test("opens what a tip's scene tells, and the favourites once it ends", () => {
    const { result, rerender, onDrawer } = favoritesLevel("sets");
    expect(onDrawer).toHaveBeenLastCalledWith(true);
    expect(result.current.set).toBeNull();

    rerender({ scene: "editedSet", sets: [FIRST, SECOND] });
    expect(onDrawer).toHaveBeenLastCalledWith(false);
    expect(result.current.set).toBe(FIRST);
    expect(result.current.editing).toBe(true);

    rerender({ scene: null, sets: [FIRST, SECOND] });
    expect(onDrawer).toHaveBeenLastCalledWith(false);
    expect(result.current.set).toBeNull();
    expect(result.current.editing).toBe(false);
  });
});

describe("a set's edits", () => {
  const setEdit = () =>
    renderHook(() => {
      const [draft, setDraft] = useState<readonly string[] | null>(null);
      return useSetEdit({ set: FIRST, draft, setDraft });
    }).result;

  test("start from the set as kept, and count as edits while they differ from it", () => {
    const result = setEdit();
    expect(result.current.songs).toEqual(FIRST.songs);
    expect(result.current.edited).toBe(false);

    act(() => result.current.edit((songs) => [...songs, "1003"]));
    expect(result.current.songs).toEqual(["1001", "1002", "1003"]);
    expect(result.current.edited).toBe(true);

    act(() => result.current.edit((songs) => songs.filter((one) => one !== "1003")));
    expect(result.current.songs).toEqual(FIRST.songs);
    expect(result.current.edited).toBe(false);
  });

  test("check songs in and out up to a set's limit", () => {
    const result = setEdit();
    expect(result.current.choice).toMatchObject({ kind: "many", limit: SET_SONG_LIMIT });

    act(() => {
      if (result.current.choice.kind === "many") {
        result.current.choice.onToggle("1001");
      }
    });

    expect(result.current.choice).toMatchObject({ picked: ["1002"] });
  });
});

describe("a gift being made", () => {
  afterEach(() => {
    setSystemTime();
  });

  const giftEdit = () =>
    renderHook(() => {
      const [gift, setGift] = useState<GiftDraft | null>(null);
      return {
        gift,
        edit: useGiftDraft({ gift, setGift }, { list: [listed("1001"), listed("1002")] }),
      };
    }).result;

  test("starts with no songs and its picture shown, timed as it starts", () => {
    const result = giftEdit();
    setSystemTime(new Date(1000));
    act(() => result.current.edit.start());
    expect(result.current.gift).toEqual({ songs: [], title: "", shown: true, madeAt: 1000 });
  });

  test("takes the time of its last change", () => {
    const result = giftEdit();
    act(() => result.current.edit.start());
    setSystemTime(new Date(2000));
    act(() => result.current.edit.change(() => ({ title: "For you" })));
    expect(result.current.gift).toMatchObject({ title: "For you", madeAt: 2000 });
  });

  test("changes nothing before it starts", () => {
    const result = giftEdit();
    act(() => result.current.edit.change(() => ({ title: "For you" })));
    expect(result.current.gift).toBeNull();
  });

  test("checks songs in and out up to a gift's limit, from every song of the list", () => {
    const result = giftEdit();
    act(() => result.current.edit.start());
    expect(result.current.edit.choice).toMatchObject({ kind: "many", limit: GIFT_SONG_LIMIT });
    expect([...(result.current.edit.pickable.offered?.songs ?? [])]).toEqual(["1001", "1002"]);

    act(() => {
      if (result.current.edit.choice.kind === "many") {
        result.current.edit.choice.onToggle("1002");
      }
    });

    expect(result.current.gift?.songs).toEqual(["1002"]);
  });
});
