import { describe, expect, test } from "bun:test";

import {
  type Genre,
  isErr,
  isOk,
  type ParseFailure,
  parseFavoriteSongEditorPage,
  type Result,
} from "../src/index";
import { FOLDER_HEADING, SONG_HEADING, songPage, TOKEN } from "./favorite-fixtures";

const PAGE = "portal_favorite_song_select.php";
const HEADING_MARKER = `h2.subtitleMypage:contains("${SONG_HEADING}")`;

function readOf(page: string) {
  const result = parseFavoriteSongEditorPage(page);
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

describe("parseFavoriteSongEditorPage", () => {
  test("reads the song number, the song's title and genre, and the token", () => {
    const { state, song, token } = readOf(songPage({ songNo: "1002", bsf: "0" }));
    expect(state).toEqual({ songNo: "1002", ura: false });
    expect(song).toEqual({ songNo: "1002", title: "サンプル曲B", genre: 8 });
    expect(token.reveal()).toBe(TOKEN);
  });

  test("reads bsf 1 as the song's 裏 entry", () => {
    expect(readOf(songPage({ songNo: "1002", bsf: "1" })).state).toEqual({
      songNo: "1002",
      ura: true,
    });
  });

  test("reads a page with no song set as no song, whatever its bsf", () => {
    const { state, song } = readOf(songPage({ songNo: null, bsf: "1" }));
    expect(state).toEqual({ songNo: null, ura: false });
    expect(song).toBeNull();
  });

  test.each<[label: string, bsf: string]>([
    ["empty", ""],
    ["spaced", " 1 "],
    ["not a number", "x-1"],
    ["another number", "3"],
  ])("reads a bsf that is %s as the song itself", (_label, bsf) => {
    expect(readOf(songPage({ bsf })).state.ura).toBe(false);
  });

  test("reads a title trimmed and decoded", () => {
    const { song } = readOf(
      songPage({
        songNo: "1005",
        songs: { "1005": { title: "  サンプル&amp;曲\t", font: "game" } },
      }),
    );
    expect(song).toEqual({ songNo: "1005", title: "サンプル&曲", genre: 5 });
  });

  type GenreCase = [fontClass: string, genre: Genre | null];
  test.each<GenreCase>([
    ["vocaloid", 4],
    ["variety", 7],
    ["", null],
    ["opera", null],
  ])("reads the genre of songNameFont%p as %p", (font, genre) => {
    const { song } = readOf(songPage({ songs: { "1001": { title: "サンプル曲A", font } } }));
    expect(song?.genre).toBe(genre);
  });

  test("takes the song from the first title on the page", () => {
    const page = songPage().replace(
      "</ul>",
      `<span class="songName songNameFontkids">サンプル曲Z</span></ul>`,
    );
    expect(readOf(page).song).toEqual({ songNo: "1001", title: "サンプル曲A", genre: 6 });
  });

  test("keeps the token out of anything serialised", () => {
    expect(JSON.stringify(parseFavoriteSongEditorPage(songPage()))).not.toContain(TOKEN);
  });

  test("refuses the login page as a logged-out page", () => {
    const result = parseFavoriteSongEditorPage(
      `<form id="login_form" action="./login_process.php"></form>`,
    );
    expect(failureOf(result)).toEqual({ kind: "loggedOut", page: PAGE });
  });
});

describe("parseFavoriteSongEditorPage refuses a page that is not the 大好きな曲 editor", () => {
  type Case = [label: string, page: string, expected: ParseFailure];
  const missing = (marker: string): ParseFailure => ({ kind: "missingMarker", page: PAGE, marker });
  const unreadable = (marker: string, raw: string): ParseFailure => ({
    kind: "unreadableValue",
    page: PAGE,
    marker,
    raw,
  });

  test.each<Case>([
    ["no heading", songPage({ heading: "" }), missing(HEADING_MARKER)],
    ["another editor's heading", songPage({ heading: FOLDER_HEADING }), missing(HEADING_MARKER)],
    ["no token", songPage().replace(`id="_tckt"`, `id="other"`), missing("#_tckt")],
    ["an empty token, without repeating it", songPage({ token: "" }), unreadable("#_tckt", "")],
    [
      "no song number input",
      songPage().replace(`id="song_no"`, `id="other"`),
      missing("input#song_no"),
    ],
    [
      "a song number with a letter",
      songPage({ songNo: "12a" }),
      unreadable("input#song_no", "12a"),
    ],
    [
      "a song number of six digits",
      songPage({ songNo: "123456" }),
      unreadable("input#song_no", "123456"),
    ],
    ["no bsf input", songPage({ bsf: null }), missing("input#bsf")],
    [
      "a song number with no title span",
      songPage().replace(`class="songName `, `class="other `),
      missing("span.songName"),
    ],
    [
      "a song whose title is empty",
      songPage({ songs: { "1001": { title: " \n ", font: "namco" } } }),
      missing("span.songName"),
    ],
  ])("%s", (_label, page, expected) => {
    const failure = failureOf(parseFavoriteSongEditorPage(page));
    expect(failure).toEqual(expected);
    expect(JSON.stringify(failure)).not.toContain(TOKEN);
  });
});
