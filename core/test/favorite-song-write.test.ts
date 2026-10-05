import { describe, expect, test } from "bun:test";

import {
  changeFavoriteSong,
  type FavoriteSongState,
  openFavoriteSongEditor,
  type Transport,
  type WriteOutcome,
} from "../src/index";
import { fakeFavorites } from "./favorite-fixtures";
import { NOON_JST, ORIGIN } from "./profile-fixtures";

const song = (songNo: string | null, ura = false): FavoriteSongState => ({ songNo, ura });
const SAVED = song("1001");
const EDITOR = "GET portal_favorite_song_select.php";
const SAVE = "POST ajax/mypage_song.php";

function change(
  transport: Transport,
  target: FavoriteSongState,
  options: { expected?: FavoriteSongState } = {},
): Promise<WriteOutcome<FavoriteSongState>> {
  return changeFavoriteSong(
    { expected: options.expected ?? SAVED, target },
    { transport, hirobaOrigin: ORIGIN, now: () => NOON_JST, crossCheck: false },
  );
}

describe("openFavoriteSongEditor", () => {
  test("reads the song number and the song with one GET, and leaves the token behind", async () => {
    const { hiroba, transport, routes } = fakeFavorites();
    const opened = await openFavoriteSongEditor({ transport, hirobaOrigin: ORIGIN });
    expect(routes()).toEqual([EDITOR]);
    expect(opened.ok && opened.value.state).toEqual(SAVED);
    expect(opened.ok && opened.value.song).toEqual({
      songNo: "1001",
      title: "サンプル曲A",
      genre: 6,
    });
    expect(opened.ok && Object.keys(opened.value)).toEqual(["state", "song"]);
    expect(JSON.stringify(opened)).not.toContain(hiroba.token);
  });

  test("reads a page with no song set as no song", async () => {
    const { hiroba, transport } = fakeFavorites();
    hiroba.song = null;
    const opened = await openFavoriteSongEditor({ transport, hirobaOrigin: ORIGIN });
    expect(opened.ok && opened.value).toEqual({ state: song(null), song: null });
  });

  test("reads a session that is gone as such", async () => {
    const { transport } = fakeFavorites();
    const gone: Transport = {
      send: () => transport.send({ method: "GET", url: `${ORIGIN}/login.php` }),
    };
    const opened = await openFavoriteSongEditor({ transport: gone, hirobaOrigin: ORIGIN });
    expect(opened).toEqual({ ok: false, error: { kind: "loggedOut" } });
  });
});

describe("changeFavoriteSong's requests", () => {
  test("sets a song with the page, one save and the page again, posting bsf 0 for the song", async () => {
    const { hiroba, transport, routes, postsTo } = fakeFavorites();
    // The page holds 1 while the song set is a 裏 entry; the new song is picked as itself.
    hiroba.bsf = "1";
    const outcome = await change(transport, song("1002"), { expected: song("1001", true) });
    expect(routes()).toEqual([EDITOR, SAVE, EDITOR]);
    const [save] = postsTo("ajax/mypage_song.php");
    expect(save?.form).toEqual([
      ["song_no", "1002"],
      ["bsf", "0"],
      ["_tckt", "1".padStart(32, "0")],
    ]);
    expect(save?.headers).toEqual({
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json, text/javascript, */*; q=0.01",
      Origin: ORIGIN,
      Referer: `${ORIGIN}/portal_favorite_song_select.php`,
    });
    expect(hiroba.song).toBe("1002");
    expect(outcome).toMatchObject({
      kind: "applied",
      before: song("1001", true),
      after: song("1002"),
      cross: "off",
    });
  });

  test("sets a song's 裏 entry by posting bsf 1, and reads it back as that entry", async () => {
    const { hiroba, transport, postsTo } = fakeFavorites();
    const outcome = await change(transport, song("1002", true));
    const [save] = postsTo("ajax/mypage_song.php");
    expect(save?.form).toContainEqual(["bsf", "1"]);
    expect(hiroba.bsf).toBe("1");
    expect(outcome).toMatchObject({ kind: "applied", after: song("1002", true) });
  });

  test("changes the song set to its own 裏 entry: a change, not the same song", async () => {
    const { transport } = fakeFavorites();
    const outcome = await change(transport, song("1001", true));
    expect(outcome).toMatchObject({ kind: "applied", before: SAVED, after: song("1001", true) });
  });

  test("sets a song where none was set", async () => {
    const { hiroba, transport } = fakeFavorites();
    hiroba.song = null;
    const outcome = await change(transport, song("1003"), { expected: song(null) });
    expect(outcome).toMatchObject({
      kind: "applied",
      before: song(null),
      after: song("1003"),
    });
  });

  test("clears the song by posting an empty song number and an empty bsf", async () => {
    const { hiroba, transport, postsTo } = fakeFavorites();
    hiroba.bsf = "1";
    const outcome = await change(transport, song(null), { expected: song("1001", true) });
    const [save] = postsTo("ajax/mypage_song.php");
    expect(save?.form).toEqual([
      ["song_no", ""],
      ["bsf", ""],
      ["_tckt", "1".padStart(32, "0")],
    ]);
    expect(hiroba.song).toBeNull();
    expect(outcome).toMatchObject({ kind: "applied", after: song(null) });
  });

  test("sends the save once, whatever the answer", async () => {
    const { hiroba, transport, postsTo } = fakeFavorites();
    hiroba.save = { code: 99, stores: false, message: "" };
    await change(transport, song("1002"));
    expect(postsTo("ajax/mypage_song.php")).toHaveLength(1);
  });
});

describe("changeFavoriteSong's result codes, by the song read back", () => {
  type CodeCase = [
    label: string,
    save: { code: number; stores: boolean; message?: string },
    expected: Record<string, unknown>,
  ];
  test.each<CodeCase>([
    ["0 with the song changed", { code: 0, stores: true }, { kind: "applied" }],
    [
      "0 with the old song read back",
      { code: 0, stores: false },
      { kind: "notApplied", reason: { kind: "unchanged" } },
    ],
    [
      "1, the song not unlocked, whatever message comes with it",
      { code: 1, stores: false, message: "sample" },
      { kind: "notApplied", reason: { kind: "refused", code: 1, message: null } },
    ],
    [
      "2, the song not published",
      { code: 2, stores: false },
      { kind: "notApplied", reason: { kind: "refused", code: 2, message: null } },
    ],
    [
      "705, the token no longer good",
      { code: 705, stores: false },
      { kind: "notApplied", reason: { kind: "stale" } },
    ],
    [
      "901, maintenance",
      { code: 901, stores: false },
      { kind: "notApplied", reason: { kind: "siteMaintenance" } },
    ],
    [
      "900, which this script does not name",
      { code: 900, stores: false },
      { kind: "notApplied", reason: { kind: "failed", code: 900 } },
    ],
    [
      "a code nobody has seen",
      { code: 42, stores: false },
      { kind: "notApplied", reason: { kind: "failed", code: 42 } },
    ],
    ["3, which is no not-synced code here", { code: 3, stores: true }, { kind: "applied" }],
    ["a refusal the song contradicts", { code: 1, stores: true }, { kind: "applied" }],
  ])("%s", async (_label, save, expected) => {
    const { hiroba, transport } = fakeFavorites();
    hiroba.save = { message: "", ...save };
    const outcome = await change(transport, song("1002"));
    expect(outcome).toMatchObject(expected);
  });
});

describe("changeFavoriteSong's refusals before anything is posted", () => {
  type RefusedCase = [label: string, target: FavoriteSongState];
  test.each<RefusedCase>([
    ["a song number with a letter", song("12a")],
    ["a song number of six digits", song("100000")],
    ["an empty song number", song("")],
    ["a 裏 entry of no song", song(null, true)],
  ])("refuses %s", async (_label, target) => {
    const { transport, routes } = fakeFavorites();
    const outcome = await change(transport, target);
    expect(outcome).toEqual({ kind: "invalidTarget", field: "favoriteSong" });
    expect(routes()).toEqual([EDITOR]);
  });

  test("posts nothing for the song that is set already", async () => {
    const { transport, routes } = fakeFavorites();
    expect(await change(transport, song("1001"))).toEqual({ kind: "nothingToChange" });
    expect(routes()).toEqual([EDITOR]);
  });

  test("posts nothing when the song was changed elsewhere since the editor was read", async () => {
    const { hiroba, transport, routes } = fakeFavorites();
    hiroba.song = "1003";
    const outcome = await change(transport, song("1002"));
    expect(outcome).toEqual({ kind: "changedSincePreview", current: song("1003") });
    expect(routes()).toEqual([EDITOR]);
  });

  test("a session that is gone before the save is sessionGone, with nothing posted", async () => {
    const { transport, routes } = fakeFavorites();
    const gone: Transport = {
      send: () => transport.send({ method: "GET", url: `${ORIGIN}/login.php` }),
    };
    const outcome = await change(gone, song("1002"));
    expect(outcome).toEqual({ kind: "sessionGone", writeMayHaveHappened: false });
    expect(routes()).toEqual(["GET login.php"]);
  });
});
