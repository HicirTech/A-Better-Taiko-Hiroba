import { describe, expect, test } from "bun:test";

import { isPage, keepPage, keptPage } from "../src/navigation/pages";
import { memoryStorage, refusing } from "./storage-fakes";

describe("keptPage", () => {
  test("opens on the Overview until a page is shown", () => {
    expect(keptPage(memoryStorage())).toBe("overview");
  });

  test("opens on the page shown last on this device", () => {
    const storage = memoryStorage();
    keepPage("favorites", storage);
    expect(keptPage(storage)).toBe("favorites");
    keepPage("settings", storage);
    expect(keptPage(storage)).toBe("settings");
  });

  test("ignores a kept value that names no page", () => {
    const storage = memoryStorage();
    storage.setItem("abth.page", "profile");
    expect(keptPage(storage)).toBe("overview");
  });

  test("works on without a store, or with one that refuses", () => {
    expect(keptPage(undefined)).toBe("overview");
    expect(keptPage(refusing)).toBe("overview");
    expect(() => keepPage("settings", refusing)).not.toThrow();
  });
});

describe("isPage", () => {
  test("accepts the three pages and nothing else", () => {
    expect(["overview", "favorites", "settings"].every(isPage)).toBe(true);
    expect([null, "", "Overview", "favourites"].some(isPage)).toBe(false);
  });
});
