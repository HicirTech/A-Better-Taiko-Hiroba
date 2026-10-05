import { describe, expect, test } from "bun:test";

import {
  forgetSearch,
  keptSearches,
  RECENT_SEARCHES,
  rememberSearch,
} from "../src/songs/search-history";
import { memoryStorage, refusing } from "./storage-fakes";

describe("rememberSearch", () => {
  test("keeps the latest search first, once, trimmed", () => {
    const storage = memoryStorage();
    rememberSearch("千本", storage);
    rememberSearch("yugen", storage);
    expect(rememberSearch("  千本 ", storage)).toEqual(["千本", "yugen"]);
    expect(keptSearches(storage)).toEqual(["千本", "yugen"]);
  });

  test("keeps no blank search", () => {
    const storage = memoryStorage();
    expect(rememberSearch("   ", storage)).toEqual([]);
    expect(storage.length).toBe(0);
  });

  test("drops the oldest beyond the limit", () => {
    const storage = memoryStorage();
    for (let index = 0; index <= RECENT_SEARCHES; index++) {
      rememberSearch(`song ${index}`, storage);
    }
    const kept = keptSearches(storage);
    expect(kept).toHaveLength(RECENT_SEARCHES);
    expect(kept[0]).toBe(`song ${RECENT_SEARCHES}`);
    expect(kept).not.toContain("song 0");
  });
});

describe("forgetSearch", () => {
  test("takes one search away and keeps the rest in order", () => {
    const storage = memoryStorage();
    for (const query of ["a", "b", "c"]) {
      rememberSearch(query, storage);
    }
    expect(forgetSearch("b", storage)).toEqual(["c", "a"]);
    expect(keptSearches(storage)).toEqual(["c", "a"]);
  });
});

describe("keptSearches", () => {
  test("is none for nothing kept, something that is no list, or a store that refuses", () => {
    expect(keptSearches(memoryStorage())).toEqual([]);
    const broken = memoryStorage();
    broken.setItem("abth.songSearches", "{");
    expect(keptSearches(broken)).toEqual([]);
    expect(keptSearches(refusing)).toEqual([]);
    expect(() => rememberSearch("a", refusing)).not.toThrow();
  });

  test("skips entries that are no text or blank", () => {
    const storage = memoryStorage();
    storage.setItem("abth.songSearches", JSON.stringify(["a", 3, "", " ", null, "b"]));
    expect(keptSearches(storage)).toEqual(["a", "b"]);
  });
});
