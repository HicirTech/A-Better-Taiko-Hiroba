import { describe, expect, test } from "bun:test";

import {
  MAX_COSTUME_HISTORY,
  mergeCostumeHistory,
  readCostumeHistory,
} from "../src/hiroba-session/costume-history";
import { MAX_PREVIEW_BYTES } from "../src/hiroba-session/preview-costume";
import { entryOf, pictureOf, SET } from "./history-fixtures";

const faces = (entries: readonly { set: { colorFace: number } }[]) =>
  entries.map(({ set }) => set.colorFace);

describe("mergeCostumeHistory", () => {
  test("puts the set worn first and the set it left second, ahead of what was listed", () => {
    const merged = mergeCostumeHistory([entryOf(1), entryOf(2)], [entryOf(8), entryOf(9)]);

    expect(faces(merged)).toEqual([8, 9, 1, 2]);
  });

  test("starts a history that has none", () => {
    expect(mergeCostumeHistory([], [entryOf(8, pictureOf("eight")), entryOf(9)])).toEqual([
      entryOf(8, pictureOf("eight")),
      entryOf(9),
    ]);
  });

  test("moves a set that is listed already up, and lists it once", () => {
    const merged = mergeCostumeHistory(
      [entryOf(1), entryOf(2), entryOf(3)],
      [entryOf(3), entryOf(1)],
    );

    expect(faces(merged)).toEqual([3, 1, 2]);
  });

  test("tells one set from another by all eight values", () => {
    const sets = [...Object.keys(SET).map((part) => ({ ...SET, [part]: 99 })), SET];
    const merged = mergeCostumeHistory(
      [],
      sets.map((set) => ({ set, picture: null })),
    );

    expect(merged).toHaveLength(Object.keys(SET).length + 1);
  });

  test("lists a set once when both sets worn are the same", () => {
    const merged = mergeCostumeHistory([entryOf(1)], [entryOf(8, pictureOf("new")), entryOf(8)]);

    expect(merged).toEqual([entryOf(8, pictureOf("new")), entryOf(1)]);
  });

  test("keeps the picture a set had when the write brings none", () => {
    const merged = mergeCostumeHistory(
      [entryOf(1, pictureOf("old one")), entryOf(2, pictureOf("old two"))],
      [entryOf(2), entryOf(7)],
    );

    expect(merged).toEqual([
      entryOf(2, pictureOf("old two")),
      entryOf(7),
      entryOf(1, pictureOf("old one")),
    ]);
  });

  test("takes the picture the write brings over the one a set had", () => {
    const merged = mergeCostumeHistory(
      [entryOf(1, pictureOf("old"))],
      [entryOf(1, pictureOf("new"))],
    );

    expect(merged).toEqual([entryOf(1, pictureOf("new"))]);
  });

  test("leaves a set with no picture anywhere without one", () => {
    expect(mergeCostumeHistory([entryOf(1)], [entryOf(2), entryOf(1)])).toEqual([
      entryOf(2),
      entryOf(1),
    ]);
  });

  test("keeps at most the cap, and the oldest set drops off", () => {
    const full = Array.from({ length: MAX_COSTUME_HISTORY }, (_, at) => entryOf(100 + at));

    const atTheCap = mergeCostumeHistory(full.slice(2), [entryOf(1), entryOf(2)]);
    const overTheCap = mergeCostumeHistory(full, [entryOf(1), entryOf(2)]);

    expect(atTheCap).toHaveLength(MAX_COSTUME_HISTORY);
    expect(atTheCap.at(-1)).toEqual(full.at(-1));
    expect(overTheCap).toHaveLength(MAX_COSTUME_HISTORY);
    expect(faces(overTheCap).slice(0, 3)).toEqual([1, 2, 100]);
    expect(faces(overTheCap)).not.toContain(full.at(-1)?.set.colorFace);
    expect(faces(overTheCap)).not.toContain(full.at(-2)?.set.colorFace);
  });

  test("leaves the history it was given as it was", () => {
    const history = [entryOf(1)];

    mergeCostumeHistory(history, [entryOf(2)]);

    expect(history).toEqual([entryOf(1)]);
  });
});

describe("readCostumeHistory", () => {
  const stored = (entries: unknown[]) => JSON.parse(JSON.stringify(entries)) as unknown;

  test("gives back what it was given when every entry is well formed", () => {
    const entries = [entryOf(1, pictureOf("one")), entryOf(2)];

    expect(readCostumeHistory(stored(entries))).toEqual(entries);
  });

  test.each<[label: string, value: unknown]>([
    ["nothing", undefined],
    ["null", null],
    ["a string", "[]"],
    ["an object", { set: SET, picture: null }],
  ])("reads %s as an empty history", (_label, value) => {
    expect(readCostumeHistory(value)).toEqual([]);
  });

  type BadEntry = [label: string, entry: unknown];
  const BAD_ENTRIES: BadEntry[] = [
    ["no set", { picture: null }],
    ["a set short of a value", { set: { ...SET, costume5: undefined }, picture: null }],
    ["a set with another key", { set: { ...SET, costume6: 0 }, picture: null }],
    ["a set value below 0", { set: { ...SET, costume1: -1 }, picture: null }],
    ["a set value past 9999", { set: { ...SET, costume1: 10000 }, picture: null }],
    ["a set value that is not whole", { set: { ...SET, costume1: 1.5 }, picture: null }],
    ["a set value that is a string", { set: { ...SET, costume1: "1" }, picture: null }],
    ["no picture key", { set: SET }],
    ["a picture that is not a string", { set: SET, picture: 7 }],
    ["a picture that is a URL", { set: SET, picture: "https://img.example.test/a.png" }],
    ["a picture of another type", { set: SET, picture: "data:image/gif;base64,R0lGODlh" }],
    ["a picture with characters base64 lacks", { set: SET, picture: "data:image/png;base64,AA!A" }],
    ["a picture cut short of whole groups", { set: SET, picture: "data:image/png;base64,AAA" }],
    ["a string", "not an entry"],
    ["null", null],
  ];

  test.each(BAD_ENTRIES)(
    "drops an entry with %s, and keeps the good ones around it",
    (_label, bad) => {
      const good = [entryOf(1, pictureOf("one")), entryOf(2)];

      expect(readCostumeHistory(stored([good[0], bad, good[1]]))).toEqual(good);
    },
  );

  test("keeps a picture of the preview limit and drops one byte more", () => {
    const pictureOfBytes = (size: number) => `data:image/png;base64,${btoa("a".repeat(size))}`;

    expect(
      readCostumeHistory([{ set: SET, picture: pictureOfBytes(MAX_PREVIEW_BYTES) }]),
    ).toHaveLength(1);
    expect(
      readCostumeHistory([{ set: SET, picture: pictureOfBytes(MAX_PREVIEW_BYTES + 1) }]),
    ).toEqual([]);
  });

  test("lists a set once, at its first place", () => {
    const read = readCostumeHistory([
      entryOf(1, pictureOf("first")),
      entryOf(2),
      entryOf(1, pictureOf("again")),
    ]);

    expect(read).toEqual([entryOf(1, pictureOf("first")), entryOf(2)]);
  });

  test("keeps the newest entries up to the cap, and the rest drop", () => {
    const entries = Array.from({ length: MAX_COSTUME_HISTORY + 1 }, (_, at) => entryOf(at + 1));

    const read = readCostumeHistory(entries);

    expect(read).toEqual(entries.slice(0, MAX_COSTUME_HISTORY));
  });

  test("drops what an entry carries beyond its set and its picture", () => {
    const read = readCostumeHistory([{ set: SET, picture: null, token: "secret" }]);

    expect(read).toEqual([{ set: SET, picture: null }]);
    expect(Object.keys(read[0] ?? {})).toEqual(["set", "picture"]);
  });
});
