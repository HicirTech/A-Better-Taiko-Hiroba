import { describe, expect, test } from "bun:test";
import {
  keepChineseNames,
  loadChineseNames,
} from "../src/shared/song-catalogue/kept-chinese-names";
import { memoryStorage } from "./storage-fakes";

describe("loadChineseNames and keepChineseNames", () => {
  test("keep a read and give it back", () => {
    const storage = memoryStorage();
    const read = { sentAt: 1_700_000_000_000, pages: [{ title: "天体観測", names: ["天體觀測"] }] };
    keepChineseNames(read, storage);
    expect(loadChineseNames(storage)).toEqual(read);
  });

  test("give nothing for an empty store, another shape or broken JSON", () => {
    const storage = memoryStorage();
    expect(loadChineseNames(storage)).toBeNull();
    storage.setItem("abth.chineseNames", JSON.stringify({ v: 2, sentAt: 1, pages: [] }));
    expect(loadChineseNames(storage)).toBeNull();
    storage.setItem("abth.chineseNames", "{");
    expect(loadChineseNames(storage)).toBeNull();
  });

  test.each<[label: string, kept: object]>([
    ["no read time", { v: 1, pages: [] }],
    ["pages that are no list", { v: 1, sentAt: 1, pages: {} }],
    ["a page with no title", { v: 1, sentAt: 1, pages: [{ names: ["天體觀測"] }] }],
    [
      "a page whose names are no text",
      { v: 1, sentAt: 1, pages: [{ title: "天体観測", names: [3] }] },
    ],
  ])("give nothing for a kept read with %s", (_label, kept) => {
    const storage = memoryStorage();
    storage.setItem("abth.chineseNames", JSON.stringify(kept));
    expect(loadChineseNames(storage)).toBeNull();
  });
});
