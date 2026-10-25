import { describe, expect, test } from "bun:test";

import {
  keepThemeMode,
  keepThemeName,
  keptThemeMode,
  keptThemeName,
} from "../src/theme/appearance";
import { memoryStorage, refusing } from "./storage-fakes";

describe("keptThemeName", () => {
  test("wears the default theme until another is chosen", () => {
    expect(keptThemeName(memoryStorage())).toBe("default");
  });

  test("keeps the theme chosen on this device", () => {
    const storage = memoryStorage();
    keepThemeName("hiroba", storage);
    expect(keptThemeName(storage)).toBe("hiroba");
  });

  test("falls back to the default for a store that refuses or holds something else", () => {
    const storage = memoryStorage();
    storage.setItem("abth.theme", "neon");
    expect(keptThemeName(storage)).toBe("default");
    expect(keptThemeName(refusing)).toBe("default");
  });
});

describe("keptThemeMode", () => {
  test("follows the system until light or dark is chosen", () => {
    expect(keptThemeMode(memoryStorage())).toBe("system");
  });

  test("keeps the mode chosen on this device, apart from the theme", () => {
    const storage = memoryStorage();
    keepThemeMode("dark", storage);
    expect(keptThemeMode(storage)).toBe("dark");
    expect(keptThemeName(storage)).toBe("default");
  });

  test("falls back to the system's for a store that refuses or holds something else", () => {
    const storage = memoryStorage();
    storage.setItem("abth.themeMode", "dim");
    expect(keptThemeMode(storage)).toBe("system");
    expect(keptThemeMode(refusing)).toBe("system");
  });
});
