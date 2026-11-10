import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react/pure";

import type { ListedSong } from "../src/shared/song-catalogue/use-song-catalogue";
import { useSongDetails } from "../src/songs/use-song-details";
import { song } from "../test/song-fixtures";
import { inADocument } from "./document";

inADocument();

const listed = (songNo: string): ListedSong => ({ ...song({ songNo }), chineseNames: [] });
const ALPHA = listed("1001");
const BETA = listed("1002");
const SONGS = new Map([ALPHA, BETA].map((one) => [one.songNo, one]));

describe("the song whose details stand over a page", () => {
  test("is none until a song opens, then that song until it closes", () => {
    const { result } = renderHook(() => useSongDetails(SONGS));
    expect(result.current).toMatchObject({ song: null, shown: false });

    act(() => result.current.open("1002"));
    expect(result.current).toMatchObject({ song: BETA, shown: true });

    act(() => result.current.close());
    expect(result.current).toMatchObject({ song: null, shown: false });
  });

  test("shows no song once the list drops it, and stays open until it is closed", () => {
    const { result, rerender } = renderHook(({ songs }) => useSongDetails(songs), {
      initialProps: { songs: SONGS },
    });
    act(() => result.current.open("1001"));

    rerender({ songs: new Map([[BETA.songNo, BETA]]) });
    expect(result.current).toMatchObject({ song: null, shown: true });
  });

  test("opens and closes through the same functions at every render", () => {
    const { result, rerender } = renderHook(() => useSongDetails(SONGS));
    const { open, close } = result.current;

    act(() => open("1001"));
    rerender();
    expect(result.current.open).toBe(open);
    expect(result.current.close).toBe(close);
  });
});
