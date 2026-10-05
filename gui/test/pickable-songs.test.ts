import { describe, expect, test } from "bun:test";

import {
  forgetPickable,
  keepPickable,
  loadPickable,
  offeredOf,
} from "../src/favorites/pickable-songs";
import { memoryStorage, refusing } from "./storage-fakes";

const KEY = "abth.pickableSongs";
const READ = { songs: ["1001", "1002"], ura: ["1001"] };

describe("the list of songs Hiroba's picker offers, kept on the device", () => {
  test("comes back as it was kept, and is gone once forgotten", () => {
    const storage = memoryStorage();
    expect(loadPickable(storage)).toBeNull();
    keepPickable(READ, storage);
    expect(loadPickable(storage)).toEqual(offeredOf(READ));
    forgetPickable(storage);
    expect(loadPickable(storage)).toBeNull();
  });

  test.each<[label: string, text: string]>([
    ["not JSON", "{"],
    ["of another version", JSON.stringify({ v: 2, ...READ })],
    ["with a song number that is not one", JSON.stringify({ v: 1, songs: ["12a"], ura: [] })],
    ["without its 裏 entries", JSON.stringify({ v: 1, songs: ["1001"] })],
  ])("is none when what was kept is %s", (_label, text) => {
    const storage = memoryStorage();
    storage.setItem(KEY, text);
    expect(loadPickable(storage)).toBeNull();
  });

  test("is none, and keeps nothing, where the device refuses to store", () => {
    expect(loadPickable(refusing)).toBeNull();
    expect(() => keepPickable(READ, refusing)).not.toThrow();
    expect(() => forgetPickable(refusing)).not.toThrow();
  });
});
