import { describe, expect, test } from "bun:test";

import { isErr, isOk, type ParseFailure, parseSongPickerPage, type Result } from "../src/index";
import { pickerPage } from "./favorite-fixtures";

const PAGE = "select_song.php";
const ROWS = [
  { songNo: "1001", ura: false },
  { songNo: "1001", ura: true },
  { songNo: "1002", ura: false },
];

function failureOf(result: Result<unknown, ParseFailure>): ParseFailure {
  if (!isErr(result)) {
    throw new Error("expected a refusal");
  }
  return result.error;
}

describe("parseSongPickerPage", () => {
  test("reads each row as a song or its 裏 entry, in page order", () => {
    const result = parseSongPickerPage(pickerPage(6, ROWS), 6);
    expect(isOk(result) && result.value).toEqual(ROWS);
  });

  test("reads a genre with no rows as none", () => {
    const result = parseSongPickerPage(pickerPage(3, []), 3);
    expect(isOk(result) && result.value).toEqual([]);
  });

  test("refuses the login page as a logged-out page", () => {
    const result = parseSongPickerPage(
      `<form id="login_form" action="./login_process.php"></form>`,
      6,
    );
    expect(failureOf(result)).toEqual({ kind: "loggedOut", page: PAGE });
  });
});

describe("parseSongPickerPage refuses a page it cannot vouch for", () => {
  const TAB = `#tabList a[href="/select_song.php?genre=6"] img`;
  type Case = [
    label: string,
    page: string,
    expected: Pick<ParseFailure, "kind"> & { marker: string },
  ];
  test.each<Case>([
    ["a page showing another genre", pickerPage(8, ROWS), { kind: "unreadableValue", marker: TAB }],
    [
      "a page without the genre's tab",
      pickerPage(6, ROWS).replace(`genre=6"`, `genre=9"`),
      { kind: "missingMarker", marker: TAB },
    ],
    [
      "a page without the song list",
      pickerPage(6, ROWS).replace(`id="songList"`, `id="other"`),
      { kind: "missingMarker", marker: "#songList" },
    ],
    [
      "a row of the folder editor's picker, which links to a slot",
      pickerPage(6, ROWS).replace(
        "/portal_favorite_song_select.php?song_no=1002&session_flg=1&bsf=0",
        "/favorite_song_select.php?song_no_14=1002&session_flg=1",
      ),
      { kind: "unreadableValue", marker: "#songList a[href]" },
    ],
    [
      "a row whose bsf is neither 0 nor 1",
      pickerPage(6, ROWS).replace(
        "song_no=1002&session_flg=1&bsf=0",
        "song_no=1002&session_flg=1&bsf=2",
      ),
      { kind: "unreadableValue", marker: "#songList a[href]" },
    ],
    [
      "a 裏 link drawn as the song",
      pickerPage(6, ROWS).replace(`<div class="songNameArea ura">`, `<div class="songNameArea">`),
      { kind: "unreadableValue", marker: "#songList a[href] (ura)" },
    ],
    [
      "a song's link drawn as 裏",
      pickerPage(6, [{ songNo: "1002", ura: false }]).replace(
        `<div class="songNameArea">`,
        `<div class="songNameArea ura">`,
      ),
      { kind: "unreadableValue", marker: "#songList a[href] (ura)" },
    ],
  ])("%s", (_label, page, expected) => {
    expect(failureOf(parseSongPickerPage(page, 6))).toMatchObject({ page: PAGE, ...expected });
  });
});
