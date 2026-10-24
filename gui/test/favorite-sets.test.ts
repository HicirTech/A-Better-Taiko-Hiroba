import { describe, expect, test } from "bun:test";

import {
  addableSongs,
  addSet,
  type FavoriteSet,
  filledSlots,
  keepSets,
  loadSets,
  moved,
  newSetName,
  refusedSong,
  removeSet,
  renameSet,
  SET_NAME_MAX_LENGTH,
  SET_SONG_LIMIT,
  sameSongs,
  setSongs,
  toggledSongs,
} from "../src/shared/sets/favorite-sets";
import { memoryStorage, refusing } from "./storage-fakes";

const set = (id: string, songs: string[] = [], name = `Set ${id}`): FavoriteSet => ({
  id,
  name,
  songs,
});
const songNumbers = (count: number, from = 1000): string[] =>
  Array.from({ length: count }, (_, index) => String(from + index));

describe("keepSets and loadSets", () => {
  test("hand back the sets that were kept, in order", () => {
    const storage = memoryStorage();
    const sets = [set("a", ["1001", "1002"]), set("b", [], "Mine")];
    keepSets(sets, storage);
    expect(loadSets(storage)).toEqual(sets);
  });

  test("keep them under one key, with a version", () => {
    const storage = memoryStorage();
    keepSets([set("a", ["1001"])], storage);
    expect(JSON.parse(storage.getItem("abth.favoriteSets") ?? "null")).toEqual({
      v: 1,
      sets: [{ id: "a", name: "Set a", songs: ["1001"] }],
    });
  });

  test.each([
    ["text that is not JSON", "{"],
    ["something that is no object", "3"],
    ["sets that are no list", JSON.stringify({ v: 1, sets: {} })],
    ["sets of no version", JSON.stringify({ sets: [set("a")] })],
  ])("keep %s aside before keeping others over them", (_label, text) => {
    const storage = memoryStorage();
    storage.setItem("abth.favoriteSets", text);

    keepSets([set("b")], storage);

    expect(storage.getItem("abth.favoriteSets.unreadable")).toBe(text);
    expect(loadSets(storage)).toEqual([set("b")]);
  });

  test("never keep sets over the sets a later version kept", () => {
    const storage = memoryStorage();
    const later = JSON.stringify({ v: 2, sets: [set("a")] });
    storage.setItem("abth.favoriteSets", later);

    keepSets([set("b")], storage);

    expect(storage.getItem("abth.favoriteSets")).toBe(later);
    expect(storage.getItem("abth.favoriteSets.unreadable")).toBeNull();
  });

  test("find no sets where none were kept", () => {
    expect(loadSets(memoryStorage())).toEqual([]);
  });

  test.each([
    ["text that is not JSON", "{"],
    ["something that is no object", "3"],
    ["another version", JSON.stringify({ v: 2, sets: [set("a")] })],
    ["sets that are no list", JSON.stringify({ v: 1, sets: {} })],
  ])("treat %s as no sets", (_label, text) => {
    const storage = memoryStorage();
    storage.setItem("abth.favoriteSets", text);
    expect(loadSets(storage)).toEqual([]);
  });

  test("leave out a set that is malformed or whose id is taken, and clean the songs of the rest", () => {
    const storage = memoryStorage();
    storage.setItem(
      "abth.favoriteSets",
      JSON.stringify({
        v: 1,
        sets: [
          { id: "a", name: "  Kept  ", songs: ["1001", "1001", "x", 7, "1002"] },
          { id: "a", name: "Same id", songs: [] },
          { id: "", name: "No id", songs: [] },
          { id: "b", name: 5, songs: [] },
          { id: "c", name: "No songs" },
          "nonsense",
          { id: "d", name: "Long", songs: songNumbers(SET_SONG_LIMIT + 5) },
        ],
      }),
    );
    const loaded = loadSets(storage);
    expect(loaded.map((one) => one.id)).toEqual(["a", "d"]);
    expect(loaded[0]).toEqual({ id: "a", name: "Kept", songs: ["1001", "1002"] });
    expect(loaded[1]?.songs).toEqual(songNumbers(SET_SONG_LIMIT));
  });

  test("work on without a store, or with one that refuses", () => {
    expect(loadSets(undefined)).toEqual([]);
    expect(loadSets(refusing)).toEqual([]);
    expect(() => keepSets([set("a")], refusing)).not.toThrow();
    expect(() => keepSets([set("a")], undefined)).not.toThrow();
  });
});

describe("addSet", () => {
  test("puts the new set last, with an id of its own, a trimmed name and clean songs", () => {
    const first = addSet([], "  Morning ", ["1001", "1001", "1002", "nope"]);
    expect(first.sets).toEqual([first.added]);
    expect(first.added.name).toBe("Morning");
    expect(first.added.songs).toEqual(["1001", "1002"]);

    const second = addSet(first.sets, "Evening", []);
    expect(second.sets).toEqual([first.added, second.added]);
    expect(second.added.id).not.toBe(first.added.id);
    expect(second.added.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("keeps a name no longer than a set may have, and as many songs as the folder has slots", () => {
    const { added } = addSet([], "n".repeat(SET_NAME_MAX_LENGTH + 10), songNumbers(40));
    expect(added.name).toHaveLength(SET_NAME_MAX_LENGTH);
    expect(added.songs).toEqual(songNumbers(SET_SONG_LIMIT));
  });

  test("leaves the sets it was given as they were", () => {
    const sets = [set("a")];
    addSet(sets, "b", []);
    expect(sets).toEqual([set("a")]);
  });
});

describe("renameSet", () => {
  const sets = [set("a", ["1001"]), set("b")];

  test("renames that set alone, trimming the name", () => {
    expect(renameSet(sets, "a", "  Renamed ")).toEqual([
      { id: "a", name: "Renamed", songs: ["1001"] },
      set("b"),
    ]);
  });

  test("leaves the sets as they are for a blank name or an id no set has", () => {
    expect(renameSet(sets, "a", "   ")).toBe(sets);
    expect(renameSet(sets, "z", "Name")).toBe(sets);
  });
});

describe("setSongs", () => {
  const sets = [set("a", ["1001"]), set("b", ["1002"])];

  test("replaces the songs of that set alone, cleaned", () => {
    expect(setSongs(sets, "a", ["1005", "1005", "1004", "?"])).toEqual([
      { id: "a", name: "Set a", songs: ["1005", "1004"] },
      set("b", ["1002"]),
    ]);
  });

  test("holds at most as many songs as the folder has slots", () => {
    expect(setSongs(sets, "a", songNumbers(40))[0]?.songs).toEqual(songNumbers(SET_SONG_LIMIT));
  });

  test("leaves the sets as they are for an id no set has", () => {
    expect(setSongs(sets, "z", ["1009"])).toBe(sets);
  });
});

describe("removeSet", () => {
  test("takes out that set alone", () => {
    expect(removeSet([set("a"), set("b"), set("c")], "b").map((one) => one.id)).toEqual(["a", "c"]);
  });
});

describe("toggledSongs", () => {
  test("puts a song that is not in last", () => {
    expect(toggledSongs(["1001", "1002"], "1003")).toEqual(["1001", "1002", "1003"]);
  });

  test("takes out a song that is in", () => {
    expect(toggledSongs(["1001", "1002", "1003"], "1002")).toEqual(["1001", "1003"]);
  });

  test("takes no song into a full set, but lets one out", () => {
    const full = songNumbers(SET_SONG_LIMIT);
    expect(toggledSongs(full, "2000")).toBe(full);
    expect(toggledSongs(full, "1000")).toHaveLength(SET_SONG_LIMIT - 1);
  });
});

describe("refusedSong", () => {
  test("lets a set with room take a song it lacks", () => {
    expect(refusedSong(set("a", ["1001"]), "1002")).toBeNull();
  });

  test("refuses a song the set holds, wherever it is", () => {
    expect(refusedSong(set("a", ["1001", "1002"]), "1001")).toBe("holds");
  });

  test("refuses any new song once the set is full, but names a held one as held", () => {
    const full = set("a", songNumbers(SET_SONG_LIMIT));
    expect(refusedSong(full, "2000")).toBe("full");
    expect(refusedSong(full, "1000")).toBe("holds");
  });
});

describe("addableSongs", () => {
  test("takes the songs a set lacks, in their order", () => {
    expect(addableSongs(["1001", "1003"], ["1002", "1003", "1004"])).toEqual(["1002", "1004"]);
  });

  test("takes only as many as the set has room for", () => {
    const held = songNumbers(SET_SONG_LIMIT - 2);
    expect(addableSongs(held, ["2001", "2002", "2003"])).toEqual(["2001", "2002"]);
  });

  test("takes none into a full set, or one that holds them all", () => {
    expect(addableSongs(songNumbers(SET_SONG_LIMIT), ["2001"])).toEqual([]);
    expect(addableSongs(["1001", "1002"], ["1002", "1001"])).toEqual([]);
  });
});

describe("sameSongs", () => {
  test("is true for the same songs in the same order only", () => {
    expect(sameSongs(["1", "2"], ["1", "2"])).toBe(true);
    expect(sameSongs([], [])).toBe(true);
    expect(sameSongs(["1", "2"], ["2", "1"])).toBe(false);
    expect(sameSongs(["1"], ["1", "2"])).toBe(false);
  });
});

describe("filledSlots", () => {
  test("lists the songs in slot order and leaves the empty slots out", () => {
    expect(filledSlots({ slots: ["1001", null, "1003", null, null] })).toEqual(["1001", "1003"]);
    expect(filledSlots({ slots: [null, null] })).toEqual([]);
  });
});

describe("newSetName", () => {
  const named = (number: number) => `Set ${number}`;

  test("counts on from the sets there are", () => {
    expect(newSetName([], named)).toBe("Set 1");
    expect(newSetName([set("a", [], "Mine"), set("b", [], "Set 1")], named)).toBe("Set 3");
  });

  test("goes past a name already taken", () => {
    expect(newSetName([set("a", [], "Set 2"), set("b", [], "Set 3")], named)).toBe("Set 4");
    expect(newSetName([set("a", [], "Set 3"), set("b", [], "Other")], named)).toBe("Set 4");
  });
});

describe("moved", () => {
  test.each([
    [0, 2, ["b", "c", "a", "d"]],
    [3, 1, ["a", "d", "b", "c"]],
    [1, 2, ["a", "c", "b", "d"]],
  ])("moves the item at %d to %d", (from, to, list) => {
    expect(moved(["a", "b", "c", "d"], from, to)).toEqual(list);
  });

  test("gives the same list for a move that goes nowhere or out of range", () => {
    const list = ["a", "b"];
    for (const [from, to] of [
      [1, 1],
      [2, 0],
      [0, 2],
      [-1, 0],
    ] as const) {
      expect(moved(list, from, to)).toBe(list);
    }
  });
});
