import { describe, expect, test } from "bun:test";

import {
  changeFolder,
  FOLDER_SLOT_COUNT,
  type FolderState,
  openFolderEditor,
  type Transport,
  type WriteOutcome,
} from "../src/index";
import { fakeFavorites, slotsOf } from "./favorite-fixtures";
import { NOON_JST, ORIGIN } from "./profile-fixtures";

const SAVED: FolderState = { slots: slotsOf("1001", "1002", "1003") };
const INIT = "GET favorite_song_select.php?init=1";
const SAVE = "POST ajax/myfavorite_song.php";
const stage = (slot: number, songNo: string) =>
  `GET favorite_song_select.php?song_no_${slot}=${songNo}&session_flg=1`;

function change(
  transport: Transport,
  target: readonly string[],
  options: { expected?: FolderState; now?: Date } = {},
): Promise<WriteOutcome<FolderState>> {
  return changeFolder(
    { expected: options.expected ?? SAVED, target },
    { transport, hirobaOrigin: ORIGIN, now: () => options.now ?? NOON_JST, crossCheck: false },
  );
}

describe("openFolderEditor", () => {
  test("reads the slots and the songs with one GET, and leaves the token behind", async () => {
    const { hiroba, transport, routes } = fakeFavorites();
    const opened = await openFolderEditor({ transport, hirobaOrigin: ORIGIN });
    expect(routes()).toEqual([INIT]);
    expect(opened.ok && opened.value.state).toEqual(SAVED);
    expect(opened.ok && opened.value.songs).toEqual([
      { songNo: "1001", title: "サンプル曲A", genre: 6 },
      { songNo: "1002", title: "サンプル曲B", genre: 8 },
      { songNo: "1003", title: "サンプル曲C", genre: 1 },
    ]);
    expect(opened.ok && Object.keys(opened.value)).toEqual(["state", "songs"]);
    expect(JSON.stringify(opened)).not.toContain(hiroba.token);
  });

  test("reads a session that is gone as such", async () => {
    const { transport } = fakeFavorites();
    const gone: Transport = {
      send: () => transport.send({ method: "GET", url: `${ORIGIN}/login.php` }),
    };
    const opened = await openFolderEditor({ transport: gone, hirobaOrigin: ORIGIN });
    expect(opened).toEqual({ ok: false, error: { kind: "loggedOut" } });
  });
});

describe("changeFolder's requests", () => {
  test("stages only the slots that change, saves all thirty with the last token, reads back", async () => {
    const { hiroba, transport, routes, postsTo } = fakeFavorites();
    const outcome = await change(transport, ["1001", "1003"]);
    expect(routes()).toEqual([INIT, stage(2, "1003"), stage(3, ""), SAVE, INIT]);
    const [save] = postsTo("ajax/myfavorite_song.php");
    expect(save?.form).toEqual([
      ...slotsOf("1001", "1003").map(
        (songNo, index) => [`song_no_${index + 1}`, songNo ?? ""] as const,
      ),
      ["_tckt", "3".padStart(32, "0")] as const,
    ]);
    expect(hiroba.folder).toEqual(slotsOf("1001", "1003"));
    expect(outcome).toMatchObject({
      kind: "applied",
      before: SAVED,
      after: { slots: slotsOf("1001", "1003") },
      cross: "off",
    });
  });

  test("posts the save as the page does: the ajax headers and the folder page as the referer", async () => {
    const { transport, postsTo } = fakeFavorites();
    await change(transport, ["1001", "1003"]);
    const [save] = postsTo("ajax/myfavorite_song.php");
    expect(save?.headers).toEqual({
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json, text/javascript, */*; q=0.01",
      Origin: ORIGIN,
      Referer: `${ORIGIN}/favorite_song_select.php`,
    });
  });

  test("empties the folder for an empty target", async () => {
    const { hiroba, transport, routes } = fakeFavorites();
    const outcome = await change(transport, []);
    expect(routes()).toEqual([INIT, stage(1, ""), stage(2, ""), stage(3, ""), SAVE, INIT]);
    expect(hiroba.folder).toEqual(slotsOf());
    expect(outcome).toMatchObject({ kind: "applied", after: { slots: slotsOf() } });
  });

  test("fills a folder with the most songs of the largest numbers", async () => {
    const full = Array.from({ length: FOLDER_SLOT_COUNT }, (_, index) => String(99970 + index));
    const { hiroba, transport, routes } = fakeFavorites();
    const outcome = await change(transport, full);
    expect(routes()).toEqual([
      INIT,
      ...full.map((songNo, index) => stage(index + 1, songNo)),
      SAVE,
      INIT,
    ]);
    expect(hiroba.folder).toEqual(full);
    expect(outcome).toMatchObject({ kind: "applied", after: { slots: full } });
  });

  test("sends the save once, whatever the answer", async () => {
    const { hiroba, transport, postsTo } = fakeFavorites();
    hiroba.save = { code: 99, stores: false, message: "" };
    await change(transport, ["1001", "1003"]);
    expect(postsTo("ajax/myfavorite_song.php")).toHaveLength(1);
  });

  test("sends nothing at all in the 05:00-07:00 JST break", async () => {
    const { transport, routes } = fakeFavorites();
    const outcome = await change(transport, ["1001", "1003"], {
      now: new Date("2026-09-26T20:30:00Z"),
    });
    expect(outcome).toEqual({ kind: "maintenance" });
    expect(routes()).toEqual([]);
  });
});

describe("changeFolder's staging", () => {
  test("stages a second time the slots a session that starts empty left out of the first", async () => {
    const { hiroba, transport, routes } = fakeFavorites();
    hiroba.initStages = false;
    const outcome = await change(transport, ["1001", "1003"]);
    expect(routes()).toEqual([INIT, stage(2, "1003"), stage(3, ""), stage(1, "1001"), SAVE, INIT]);
    expect(outcome).toMatchObject({ kind: "applied", after: { slots: slotsOf("1001", "1003") } });
  });

  test("stops before the save when Hiroba keeps a slot it was told to empty", async () => {
    const { hiroba, transport, routes } = fakeFavorites();
    hiroba.ignoresEmpty = true;
    const outcome = await change(transport, ["1003", "1001"]);
    expect(routes()).toEqual([
      INIT,
      stage(1, "1003"),
      stage(2, "1001"),
      stage(3, ""),
      stage(3, ""),
    ]);
    expect(outcome).toEqual({
      kind: "notStaged",
      before: SAVED,
      staged: { slots: slotsOf("1003", "1001", "1003") },
      expectedAfter: { slots: slotsOf("1003", "1001") },
    });
    expect(hiroba.folder).toEqual([...SAVED.slots]);
  });

  test("a staging read that lands on the login page is sessionGone, with nothing posted", async () => {
    const { transport, routes } = fakeFavorites();
    const gone: Transport = {
      send: (request) =>
        request.method === "GET" && request.url.includes("session_flg=1")
          ? transport.send({ method: "GET", url: `${ORIGIN}/login.php` })
          : transport.send(request),
    };
    const outcome = await change(gone, ["1001", "1003"]);
    expect(outcome).toEqual({ kind: "sessionGone", writeMayHaveHappened: false });
    expect(routes()).toEqual([INIT, "GET login.php"]);
  });
});

describe("changeFolder's result codes, by the folder read back", () => {
  type CodeCase = [
    label: string,
    save: { code: number; stores: boolean; message?: string },
    expected: Record<string, unknown>,
  ];
  test.each<CodeCase>([
    ["0 with the folder changed", { code: 0, stores: true }, { kind: "applied" }],
    [
      "0 with nothing changed",
      { code: 0, stores: false },
      { kind: "notApplied", reason: { kind: "unchanged" } },
    ],
    [
      "a refusal, with the site's errmsg",
      { code: 1, stores: false, message: "sample" },
      { kind: "notApplied", reason: { kind: "refused", code: 1, message: "sample" } },
    ],
    [
      "705, which this script does not name, is a refusal like the rest",
      { code: 705, stores: false },
      { kind: "notApplied", reason: { kind: "refused", code: 705, message: null } },
    ],
    ["3, which is no not-synced code here", { code: 3, stores: true }, { kind: "applied" }],
    ["a refusal the folder contradicts", { code: 5, stores: true }, { kind: "applied" }],
  ])("%s", async (_label, save, expected) => {
    const { hiroba, transport } = fakeFavorites();
    hiroba.save = { message: "", ...save };
    const outcome = await change(transport, ["1001", "1003"]);
    expect(outcome).toMatchObject(expected);
  });
});

describe("changeFolder's refusals before anything is posted", () => {
  type RefusedCase = [label: string, target: readonly string[]];
  test.each<RefusedCase>([
    [
      "more songs than the folder has slots",
      Array.from({ length: FOLDER_SLOT_COUNT + 1 }, (_, index) => String(2001 + index)),
    ],
    ["a song listed twice", ["1001", "1004", "1001"]],
    ["a song number with a letter", ["1004", "12a"]],
    ["an empty song number", ["1004", ""]],
    ["a song number of six digits", ["100000"]],
  ])("refuses %s", async (_label, target) => {
    const { transport, routes } = fakeFavorites();
    const outcome = await change(transport, target);
    expect(outcome).toEqual({ kind: "invalidTarget", field: "folder" });
    expect(routes()).toEqual([INIT]);
  });

  test("posts nothing for the folder that is saved already", async () => {
    const { transport, routes } = fakeFavorites();
    const outcome = await change(transport, ["1001", "1002", "1003"]);
    expect(outcome).toEqual({ kind: "nothingToChange" });
    expect(routes()).toEqual([INIT]);
  });

  test("posts nothing when the folder was changed elsewhere since the editor was read", async () => {
    const { hiroba, transport, routes } = fakeFavorites();
    hiroba.folder = slotsOf("1004");
    const outcome = await change(transport, ["1001"]);
    expect(outcome).toEqual({ kind: "changedSincePreview", current: { slots: slotsOf("1004") } });
    expect(routes()).toEqual([INIT]);
  });
});
