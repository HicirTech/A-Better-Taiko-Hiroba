import { describe, expect, test } from "bun:test";

import { isPage, keepPage, keptPage, PAGES } from "../src/navigation/pages";
import { memoryStorage, refusing } from "./storage-fakes";

describe("PAGES", () => {
  test("lists the Costume page, then Nickname & title, between the Overview and Favourites", () => {
    expect([...PAGES]).toEqual(["overview", "costume", "nameTitle", "favorites", "settings"]);
  });
});

describe("keptPage", () => {
  test("opens on the Overview until a page is shown", () => {
    expect(keptPage(memoryStorage())).toBe("overview");
  });

  test("opens on the page shown last on this device", () => {
    const storage = memoryStorage();
    keepPage("favorites", storage);
    expect(keptPage(storage)).toBe("favorites");
    keepPage("costume", storage);
    expect(keptPage(storage)).toBe("costume");
    keepPage("nameTitle", storage);
    expect(keptPage(storage)).toBe("nameTitle");
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
  test("accepts the five pages and nothing else", () => {
    expect(["overview", "costume", "nameTitle", "favorites", "settings"].every(isPage)).toBe(true);
    expect(
      [null, "", "Overview", "Costume", "favourites", "name-title", "nametitle"].some(isPage),
    ).toBe(false);
  });
});
