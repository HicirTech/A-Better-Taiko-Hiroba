import { describe, expect, test } from "bun:test";

import { pickedLocale, rememberLocale, startingLocale } from "../src/language/locale-choice";

/** A page store kept in memory, as the app page's localStorage keeps one. */
function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

/** A store that refuses every call, as a private window's may. */
const refusing: Storage = {
  length: 0,
  clear: () => {
    throw new Error("refused");
  },
  getItem: () => {
    throw new Error("refused");
  },
  key: () => null,
  removeItem: () => {
    throw new Error("refused");
  },
  setItem: () => {
    throw new Error("refused");
  },
};

describe("startingLocale", () => {
  test("follows the system until a language is picked", () => {
    expect(startingLocale(memoryStorage(), ["en-NZ"])).toBe("en");
  });

  test("falls back to English for a language the catalog does not carry", () => {
    expect(startingLocale(memoryStorage(), ["ko-KR"])).toBe("en");
    expect(startingLocale(memoryStorage(), [])).toBe("en");
  });

  test("opens in the language picked on this device", () => {
    const storage = memoryStorage();
    rememberLocale("en", storage);
    expect(pickedLocale(storage)).toBe("en");
    expect(startingLocale(storage, ["ko-KR"])).toBe("en");
  });

  test("ignores a kept value that names no locale", () => {
    const storage = memoryStorage();
    storage.setItem("abth.locale", "klingon");
    expect(pickedLocale(storage)).toBeNull();
  });

  test("works on without a store, or with one that refuses", () => {
    expect(pickedLocale(undefined)).toBeNull();
    expect(pickedLocale(refusing)).toBeNull();
    expect(() => rememberLocale("en", refusing)).not.toThrow();
    expect(startingLocale(refusing, ["en-US"])).toBe("en");
  });
});
