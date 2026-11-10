import { describe, expect, mock, test } from "bun:test";
import { createTranslator } from "@abth/i18n";
import { act, renderHook } from "@testing-library/react/pure";

import type { FavoriteSet } from "../src/shared/sets/favorite-sets";
import type { FavoriteSets } from "../src/shared/sets/use-favorite-sets";
import { useAddToSet } from "../src/songs/use-add-to-set";
import { inADocument } from "./document";

inADocument();

const EN = createTranslator("en");
const SET: FavoriteSet = {
  id: "a",
  name: EN.t("favorites.setName", { number: 1 }),
  songs: ["1001"],
};

/** The sets on the device, each change noted rather than made. */
function keptSetsNoting() {
  return {
    sets: [SET],
    add: mock((_name: string, _songs: readonly string[]) => "b"),
    rename: mock(() => undefined),
    replaceSongs: mock((_id: string, _songs: readonly string[]) => undefined),
    moveSet: mock(() => undefined),
    remove: mock(() => undefined),
    reload: mock(() => undefined),
  } satisfies FavoriteSets;
}

/** The hook with its chooser open on song 1002. */
function chooserOpen() {
  const kept = keptSetsNoting();
  const { result } = renderHook(() => useAddToSet<string>(kept, EN));
  act(() => result.current.choose("1002"));
  return { kept, result };
}

describe("songs going into a set on the device", () => {
  test("go at a set's end, and the chooser shuts", () => {
    const { kept, result } = chooserOpen();
    expect(result.current.adding).toBe("1002");

    act(() => result.current.addTo(SET, ["1002", "1003"]));
    expect(kept.replaceSongs).toHaveBeenCalledWith("a", ["1001", "1002", "1003"]);
    expect(result.current.adding).toBeNull();
  });

  test("leave every set as it was when the chooser shuts", () => {
    const { kept, result } = chooserOpen();
    act(() => result.current.close());
    expect(result.current.adding).toBeNull();
    expect(kept.replaceSongs).not.toHaveBeenCalled();
  });

  test("ask a new set's name over the chooser, and Cancel goes back to it", () => {
    const { kept, result } = chooserOpen();
    act(() => result.current.nameNew(["1002"]));
    expect(result.current.naming).toMatchObject({
      title: EN.t("favorites.newSet"),
      initial: EN.t("favorites.setName", { number: 2 }),
    });
    expect(result.current.adding).toBe("1002");

    act(() => result.current.naming?.onCancel());
    expect(result.current.naming).toBeNull();
    expect(result.current.adding).toBe("1002");
    expect(kept.add).not.toHaveBeenCalled();
  });

  test("make the new set with its name, then shut both questions", () => {
    const { kept, result } = chooserOpen();
    act(() => result.current.nameNew(["1002"]));
    act(() => result.current.naming?.onSave("Mine"));
    expect(kept.add).toHaveBeenCalledWith("Mine", ["1002"]);
    expect(result.current).toMatchObject({ adding: null, naming: null });
  });
});
