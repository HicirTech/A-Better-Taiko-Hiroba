import { describe, expect, test } from "bun:test";

import { keepJson, keptJson } from "../src/shared/kept-settings";
import { memoryStorage, refusing } from "./storage-fakes";

const KEY = "abth.kept";
const countIn = ({ count }: Record<string, unknown>) => (typeof count === "number" ? count : null);

describe("JSON kept with the version of its shape", () => {
  test("is kept with its version, and read back through its reader", () => {
    const storage = memoryStorage();
    keepJson(KEY, 2, { count: 7 }, storage);
    expect(JSON.parse(storage.getItem(KEY) ?? "null")).toEqual({ v: 2, count: 7 });
    expect(keptJson(KEY, 2, countIn, storage)).toBe(7);
  });

  test.each<[label: string, text: string | null]>([
    ["nothing kept", null],
    ["text that is not JSON", "{"],
    ["JSON that is no object", "7"],
    ["another version", JSON.stringify({ v: 1, count: 7 })],
    ["a shape its reader refuses", JSON.stringify({ v: 2, count: "7" })],
  ])("is none for %s", (_label, text) => {
    const storage = memoryStorage();
    if (text !== null) {
      storage.setItem(KEY, text);
    }
    expect(keptJson(KEY, 2, countIn, storage)).toBeNull();
  });

  test("is none without a store or with one that refuses, where keeping throws nothing", () => {
    expect(keptJson(KEY, 2, countIn, undefined)).toBeNull();
    expect(keptJson(KEY, 2, countIn, refusing)).toBeNull();
    expect(() => keepJson(KEY, 2, { count: 7 }, refusing)).not.toThrow();
  });
});
