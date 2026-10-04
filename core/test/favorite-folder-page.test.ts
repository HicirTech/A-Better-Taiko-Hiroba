import { describe, expect, test } from "bun:test";

import {
  FOLDER_SLOT_COUNT,
  type Genre,
  isErr,
  isOk,
  type ParseFailure,
  parseFolderEditorPage,
  type Result,
} from "../src/index";
import { FOLDER_HEADING, folderPage, folderSlot, SONG_HEADING, TOKEN } from "./favorite-fixtures";

const PAGE = "favorite_song_select.php";
const HEADING_MARKER = `h2.subtitleMypage:contains("${FOLDER_HEADING}")`;

function readOf(page: string) {
  const result = parseFolderEditorPage(page);
  if (!isOk(result)) {
    throw new Error(`expected an editor, got ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

function failureOf(result: Result<unknown, ParseFailure>): ParseFailure {
  if (!isErr(result)) {
    throw new Error("expected a refusal");
  }
  return result.error;
}

describe("parseFolderEditorPage", () => {
  test("reads every slot, the songs in the filled ones and the token", () => {
    const { state, songs, token } = readOf(folderPage({ slots: ["1001", "1002", null, "1003"] }));
    expect(state.slots).toHaveLength(FOLDER_SLOT_COUNT);
    expect(state.slots.slice(0, 5)).toEqual(["1001", "1002", null, "1003", null]);
    expect(songs).toEqual([
      { songNo: "1001", title: "サンプル曲A", genre: 6 },
      { songNo: "1002", title: "サンプル曲B", genre: 8 },
      { songNo: "1003", title: "サンプル曲C", genre: 1 },
    ]);
    expect(token.reveal()).toBe(TOKEN);
  });

  test("reads a full folder to its last slot", () => {
    const full = Array.from({ length: FOLDER_SLOT_COUNT }, (_, index) => String(2001 + index));
    const { state, songs } = readOf(folderPage({ slots: full }));
    expect(state.slots).toEqual(full);
    expect(songs.map((song) => song.songNo)).toEqual(full);
  });

  test("reads an empty folder as thirty empty slots and no songs", () => {
    const { state, songs } = readOf(folderPage());
    expect(state.slots).toEqual(Array.from({ length: FOLDER_SLOT_COUNT }, () => null));
    expect(songs).toEqual([]);
  });

  test("keeps a song of the last slot when the slots before it are empty", () => {
    const slots = Array.from({ length: FOLDER_SLOT_COUNT }, (_, index) =>
      index === FOLDER_SLOT_COUNT - 1 ? "1004" : null,
    );
    const { state, songs } = readOf(folderPage({ slots }));
    expect(state.slots[FOLDER_SLOT_COUNT - 1]).toBe("1004");
    expect(songs).toEqual([{ songNo: "1004", title: "サンプル曲D", genre: 2 }]);
  });

  test("reads a title trimmed and decoded, its inner spaces kept", () => {
    const { songs } = readOf(
      folderPage({
        slots: ["1005"],
        songs: { "1005": { title: "  サンプル&amp;曲 vs 曲\t", font: "game" } },
      }),
    );
    expect(songs).toEqual([{ songNo: "1005", title: "サンプル&曲 vs 曲", genre: 5 }]);
  });

  type GenreCase = [fontClass: string, genre: Genre | null];
  test.each<GenreCase>([
    ["jpop", 1],
    ["anime", 2],
    ["kids", 3],
    ["vocaloid", 4],
    ["game", 5],
    ["namco", 6],
    ["variety", 7],
    ["classic", 8],
    ["", null],
    ["opera", null],
    ["constructor", null],
  ])("reads the genre of songNameFont%p as %p", (font, genre) => {
    const { songs } = readOf(
      folderPage({ slots: ["1001"], songs: { "1001": { title: "サンプル曲A", font } } }),
    );
    expect(songs[0]?.genre).toBe(genre);
  });

  test("keeps the token out of anything serialised", () => {
    expect(JSON.stringify(parseFolderEditorPage(folderPage({ slots: ["1001"] })))).not.toContain(
      TOKEN,
    );
  });

  test("refuses the login page as a logged-out page", () => {
    const result = parseFolderEditorPage(
      `<form id="login_form" action="./login_process.php"></form>`,
    );
    expect(failureOf(result)).toEqual({ kind: "loggedOut", page: PAGE });
  });
});

describe("parseFolderEditorPage refuses a page that is not the folder editor", () => {
  type Case = [label: string, page: string, expected: ParseFailure];
  const missing = (marker: string): ParseFailure => ({ kind: "missingMarker", page: PAGE, marker });
  const unreadable = (marker: string, raw: string): ParseFailure => ({
    kind: "unreadableValue",
    page: PAGE,
    marker,
    raw,
  });
  const slotPair = (slot: number) => `id="song_no_${slot}" name="song_no_${slot}"`;
  const otherPair = (slot: number) => `id="other_${slot}" name="other_${slot}"`;

  test.each<Case>([
    ["no heading", folderPage({ heading: "" }), missing(HEADING_MARKER)],
    ["another editor's heading", folderPage({ heading: SONG_HEADING }), missing(HEADING_MARKER)],
    ["no token", folderPage().replace(`id="_tckt"`, `id="other"`), missing("#_tckt")],
    ["an empty token, without repeating it", folderPage({ token: "" }), unreadable("#_tckt", "")],
    [
      "no input for the first slot",
      folderPage().replace(slotPair(1), otherPair(1)),
      missing("input#song_no_1"),
    ],
    [
      "no input for a slot in the middle",
      folderPage().replace(slotPair(17), otherPair(17)),
      missing("input#song_no_17"),
    ],
    [
      "no input for the last slot",
      folderPage().replace(slotPair(FOLDER_SLOT_COUNT), otherPair(FOLDER_SLOT_COUNT)),
      missing(`input#song_no_${FOLDER_SLOT_COUNT}`),
    ],
    [
      "a song number with a letter",
      folderPage({ slots: ["1001", "12a"] }),
      unreadable("input#song_no_2", "12a"),
    ],
    [
      "a song number of six digits",
      folderPage({ slots: ["123456"] }),
      unreadable("input#song_no_1", "123456"),
    ],
    [
      "a song number with a space",
      folderPage({ slots: ["1001", " 1002"] }),
      unreadable("input#song_no_2", " 1002"),
    ],
    [
      "a filled slot whose title is empty",
      folderPage({ slots: ["1001"], songs: { "1001": { title: " \n ", font: "namco" } } }),
      missing("span.songName input#song_no_1"),
    ],
    [
      "a filled slot whose input is outside any title",
      folderPage({ slots: ["1001", "1002"] }).replace(
        folderSlot(2, "1002"),
        `<ul><li><input type="hidden" ${slotPair(2)} value="1002"></li></ul>`,
      ),
      missing("span.songName input#song_no_2"),
    ],
  ])("%s", (_label, page, expected) => {
    const failure = failureOf(parseFolderEditorPage(page));
    expect(failure).toEqual(expected);
    expect(JSON.stringify(failure)).not.toContain(TOKEN);
  });
});
