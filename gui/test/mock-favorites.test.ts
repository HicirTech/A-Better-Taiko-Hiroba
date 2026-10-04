import { describe, expect, test } from "bun:test";
import { FOLDER_SLOT_COUNT } from "@abth/core";

import type { MockSession } from "../scripts/mock-costume";
import { createFavoritesEditor, type FavoritesState } from "../scripts/mock-favorites";

const START_FOLDER = ["1001", "1008", "1014", "1020", "1031", "1026"];
const START_TITLES = [
  "夜明けのスケッチ",
  "光の翼 ～Wings of Light～",
  "ひだまりのうた",
  "あの日の手紙",
  "ひだまりのうた",
  "ドンドコ祭りだよ",
];
const STALE = { result: 705, errmsg: "更新に失敗しました。再度画面の読み込みを行ってください。" };

const slots = (...songs: (string | null)[]) => [
  ...songs,
  ...Array.from({ length: FOLDER_SLOT_COUNT - songs.length }, () => null),
];
const unsetIn = (page: string) => page.split("未設定").length - 1;

function standIn() {
  let issued = 0;
  const editor = createFavoritesEditor({
    issue: (session) => {
      issued += 1;
      session.ticket = `ticket-${issued}`;
      return session.ticket;
    },
  });
  const session: MockSession = { cardChosen: true };
  const change = async (query = "") =>
    (await editor.hook("/__favorites", new URLSearchParams(query))?.json()) as FavoritesState;
  const token = () => session.ticket ?? "";
  return {
    editor,
    session,
    change,
    state: () => change(),
    folderPage: (query = "") => editor.folderPage(session, new URLSearchParams(query)),
    saveFolder: (body: Record<string, string> = {}, ticket = token()) =>
      editor.saveFolder(session, new URLSearchParams({ ...body, _tckt: ticket })),
    saveSong: (songNo: string | undefined, ticket = token()) =>
      editor.saveFavoriteSong(
        session,
        new URLSearchParams({
          ...(songNo === undefined ? {} : { song_no: songNo }),
          bsf: "0",
          _tckt: ticket,
        }),
      ),
  };
}

describe("the favourites stand-in at the start", () => {
  test("has six songs in the saved folder, one of them the 大好きな曲, and nothing staged", async () => {
    expect(await standIn().state()).toEqual({
      folder: slots(...START_FOLDER),
      favoriteSong: "1008",
      staging: slots(),
      initStages: true,
      emptyClears: true,
    });
  });

  test("shows the saved songs on my page by title, in the folder's order", () => {
    const blocks = standIn().editor.myPageBlocks("my-token");
    const listed = [
      ...blocks.matchAll(/<li><span class="songName songNameFont\w+">([^<]*)<\/span><\/li>/g),
    ];
    expect(listed.map(([, title]) => title)).toEqual(START_TITLES);
    expect(blocks).toContain(
      '<div class="name"><span class="songName songNameFontanime">光の翼 ～Wings of Light～</span></div>',
    );
    expect(blocks).toContain('<input type="hidden" name="song_no" id="song_no" value="1008">');
    expect(blocks).toContain('<input type="hidden" id="_tckt" name="_tckt" value="my-token" />');
  });
});

describe("the folder editor's GET", () => {
  test.each<[initStages: boolean]>([[true], [false]])(
    "with init=1 shows the saved folder, and stages it only when initStages is %p",
    async (on) => {
      const stand = standIn();
      await stand.change(`initStages=${on ? 1 : 0}`);
      const page = stand.folderPage("init=1");
      expect((await stand.state()).staging).toEqual(on ? slots(...START_FOLDER) : slots());
      expect(unsetIn(page)).toBe(FOLDER_SLOT_COUNT - START_FOLDER.length);
    },
  );

  test("without init=1 shows the staging, which is empty at first", () => {
    expect(unsetIn(standIn().folderPage())).toBe(FOLDER_SLOT_COUNT);
  });

  type EmptyCase = [emptyClears: boolean, kept: string | null];
  test.each<EmptyCase>([
    [true, null],
    [false, "1001"],
  ])("with an empty value for a slot, and emptyClears %p, leaves it as %p", async (on, kept) => {
    const stand = standIn();
    await stand.change(`emptyClears=${on ? 1 : 0}`);
    stand.folderPage("init=1");
    stand.folderPage("session_flg=1&song_no_1=");
    expect((await stand.state()).staging).toEqual(slots(kept, ...START_FOLDER.slice(1)));
  });

  test("with a song of the list for a slot, stages that song there and the other slots stay", async () => {
    const stand = standIn();
    stand.folderPage("init=1");
    stand.folderPage("session_flg=1&song_no_10=1010");
    const staging = slots(...START_FOLDER);
    staging[9] = "1010";
    expect((await stand.state()).staging).toEqual(staging);
  });

  type OtherValueCase = [why: string, value: string];
  test.each<OtherValueCase>([
    ["a number the list lacks", "9999"],
    ["a console-only song", "ns2_sample"],
    ["a deleted song", "1039"],
    ["text", "abc"],
  ])("with %s for a slot, leaves the slot as it is", async (_why, value) => {
    const stand = standIn();
    stand.folderPage("init=1");
    stand.folderPage(`session_flg=1&song_no_2=${value}`);
    expect((await stand.state()).staging).toEqual(slots(...START_FOLDER));
  });

  type NoStagingCase = [why: string, query: string];
  test.each<NoStagingCase>([
    ["no session_flg", "song_no_3=1010"],
    ["a session_flg that is not 1", "session_flg=0&song_no_3=1010"],
    ["two slots", "session_flg=1&song_no_3=1010&song_no_4=1011"],
    ["slot 0", "session_flg=1&song_no_0=1010"],
    ["slot 31", `session_flg=1&song_no_${FOLDER_SLOT_COUNT + 1}=1010`],
    ["a slot written 03", "session_flg=1&song_no_03=1010"],
    ["no slot", "session_flg=1"],
  ])("with %s stages nothing", async (_why, query) => {
    const stand = standIn();
    stand.folderPage(query);
    expect((await stand.state()).staging).toEqual(slots());
  });
});

describe("the folder editor's page", () => {
  test("has its heading, a hidden input for each slot and the token", () => {
    const stand = standIn();
    const page = stand.folderPage("init=1");
    expect(page).toContain('<h2 class="subtitleMypage">「お気に入り」フォルダの設定</h2>');
    expect(page.match(/id="song_no_\d+"/g)).toHaveLength(FOLDER_SLOT_COUNT);
    expect(page).toContain(
      `<input type="hidden" id="_tckt" name="_tckt" value="${stand.session.ticket}">`,
    );
  });

  test("draws a filled slot as a span that holds its input, and an empty slot as 未設定 beside one", () => {
    const page = standIn().folderPage("init=1");
    expect(page).toContain(
      '<span class="songName songNameFontjpop">夜明けのスケッチ<input type="hidden" id="song_no_1" name="song_no_1" value="1001"></span>',
    );
    expect(page).toContain(
      '<span class="songName songNameFont">未設定</span><input type="hidden" id="song_no_7" name="song_no_7" value="">',
    );
  });

  type GenreClassCase = [songNo: string, genreClass: string];
  test.each<GenreClassCase>([
    ["1001", "jpop"],
    ["1008", "anime"],
    ["1014", "kids"],
    ["1017", "vocaloid"],
    ["1022", "game"],
    ["1026", "namco"],
    ["1030", "variety"],
    ["1034", "classic"],
    ["1012", "anime"],
  ])("gives the song %s the class songNameFont%s, from its first genre", (songNo, genreClass) => {
    const page = standIn().folderPage(`session_flg=1&song_no_1=${songNo}`);
    expect(page).toMatch(
      new RegExp(
        `<span class="songName songNameFont${genreClass}">[^<]+<input type="hidden" id="song_no_1" name="song_no_1" value="${songNo}"></span>`,
      ),
    );
  });

  test("escapes a title with an ampersand", () => {
    const page = standIn().folderPage("session_flg=1&song_no_1=1033");
    expect(page).toContain("Rock &amp; Roll ドンドン<input");
  });
});

describe("saving the folder", () => {
  test("turns the staging into the saved folder, empties the staging and answers 0", async () => {
    const stand = standIn();
    stand.folderPage("init=1");
    stand.folderPage("session_flg=1&song_no_7=1010");
    stand.folderPage("session_flg=1&song_no_1=");
    const answer = await stand.saveFolder().json();
    expect(answer).toEqual({ result: 0, errmsg: "更新しました。" });
    expect(await stand.state()).toMatchObject({
      folder: slots(null, ...START_FOLDER.slice(1), "1010"),
      staging: slots(),
    });
  });

  test("saves an empty staging as an empty folder, for it posts only what was staged", async () => {
    const stand = standIn();
    stand.folderPage();
    await stand.saveFolder();
    expect((await stand.state()).folder).toEqual(slots());
  });

  test("takes nothing from the body but the token", async () => {
    const stand = standIn();
    stand.folderPage("init=1");
    await stand.saveFolder({ song_no_1: "1030", song_no_2: "" });
    expect((await stand.state()).folder).toEqual(slots(...START_FOLDER));
  });

  test("answers 705 to a token a later page has voided, and changes nothing", async () => {
    const stand = standIn();
    stand.folderPage("init=1");
    const voided = stand.session.ticket ?? "";
    stand.folderPage("session_flg=1&song_no_3=1010");
    const answer = await stand.saveFolder({}, voided).json();
    expect(answer).toEqual(STALE);
    const staging = slots(...START_FOLDER);
    staging[2] = "1010";
    expect(await stand.state()).toMatchObject({ folder: slots(...START_FOLDER), staging });
  });

  test("takes a token for one save only", async () => {
    const stand = standIn();
    stand.folderPage("init=1");
    const token = stand.session.ticket ?? "";
    expect(await stand.saveFolder({}, token).json()).toMatchObject({ result: 0 });
    expect(await stand.saveFolder({}, token).json()).toEqual(STALE);
  });

  test("answers 705 when no page has been read", async () => {
    expect(await standIn().saveFolder({}, "").json()).toEqual(STALE);
  });
});

describe("the 大好きな曲", () => {
  test("is drawn on its page with its title, genre class, number, bsf and token", () => {
    const stand = standIn();
    const page = stand.editor.favoriteSongPage(stand.session);
    expect(page).toContain('<h2 class="subtitleMypage">「大好きな曲」の設定</h2>');
    expect(page).toContain(
      '<span class="songName songNameFontanime">光の翼 ～Wings of Light～</span>',
    );
    expect(page).toContain('<input type="hidden" name="song_no" id="song_no" value="1008">');
    expect(page).toContain('<input type="hidden" name="bsf" id="bsf" value="0">');
    expect(page).toContain(
      `<input type="hidden" id="_tckt" name="_tckt" value="${stand.session.ticket}">`,
    );
  });

  test("is set to a song of the list", async () => {
    const stand = standIn();
    stand.editor.favoriteSongPage(stand.session);
    expect(await stand.saveSong("1010").json()).toEqual({ result: 0 });
    expect((await stand.state()).favoriteSong).toBe("1010");
  });

  test("is cleared by an empty song_no, and the page then says 未設定", async () => {
    const stand = standIn();
    stand.editor.favoriteSongPage(stand.session);
    expect(await stand.saveSong("").json()).toEqual({ result: 0 });
    expect((await stand.state()).favoriteSong).toBeNull();
    const page = stand.editor.favoriteSongPage(stand.session);
    expect(page).toContain('<span class="songName songNameFont">未設定</span>');
    expect(page).toContain('id="song_no" value=""');
  });

  type RefusedCase = [why: string, songNo: string | undefined];
  test.each<RefusedCase>([
    ["a number the list lacks", "9999"],
    ["a console-only song", "ns2_sample"],
    ["a deleted song", "1039"],
    ["text", "abc"],
    ["no song_no", undefined],
  ])("answers 1 and changes nothing for %s", async (_why, songNo) => {
    const stand = standIn();
    stand.editor.favoriteSongPage(stand.session);
    expect(await stand.saveSong(songNo).json()).toEqual({ result: 1 });
    expect((await stand.state()).favoriteSong).toBe("1008");
  });

  test("answers 705 to a token a later page has voided, and changes nothing", async () => {
    const stand = standIn();
    stand.editor.favoriteSongPage(stand.session);
    const voided = stand.session.ticket ?? "";
    stand.editor.favoriteSongPage(stand.session);
    expect(await stand.saveSong("1010", voided).json()).toEqual(STALE);
    expect((await stand.state()).favoriteSong).toBe("1008");
  });
});

describe("my page's favourites after a save", () => {
  test("show the new folder and song, and say 未設定 and list nothing once both are cleared", async () => {
    const stand = standIn();
    stand.folderPage();
    await stand.saveFolder();
    stand.editor.favoriteSongPage(stand.session);
    await stand.saveSong("");
    const blocks = stand.editor.myPageBlocks("my-token");
    expect(blocks).toContain(
      '<div class="name"><span class="songName songNameFont">未設定</span></div>',
    );
    expect(blocks).toContain('id="song_no" value=""');
    expect(blocks).toContain('<ul id="songList"></ul>');
  });

  test("show the saved folder, not the staging", async () => {
    const stand = standIn();
    stand.folderPage("init=1");
    stand.folderPage("session_flg=1&song_no_1=1030");
    expect(stand.editor.myPageBlocks("my-token")).not.toContain("お笑いスペシャルメドレー");
    await stand.saveFolder();
    expect(stand.editor.myPageBlocks("my-token")).toContain("お笑いスペシャルメドレー");
  });
});

describe("the hooks", () => {
  test("reset restores the start state, the switches included", async () => {
    const stand = standIn();
    await stand.change("initStages=0&emptyClears=0");
    stand.folderPage("session_flg=1&song_no_1=1030");
    await stand.saveFolder();
    stand.editor.favoriteSongPage(stand.session);
    await stand.saveSong("1010");
    expect(await stand.change("reset=1")).toEqual(await standIn().state());
  });

  test("reset comes before the switches named with it", async () => {
    const stand = standIn();
    await stand.change("emptyClears=0");
    expect(await stand.change("reset=1&initStages=0")).toMatchObject({
      initStages: false,
      emptyClears: true,
    });
  });

  test("a switch takes 0 or 1, and nothing else", async () => {
    const stand = standIn();
    await stand.change("initStages=0");
    expect(await stand.change("initStages=2&emptyClears=yes")).toMatchObject({
      initStages: false,
      emptyClears: true,
    });
  });

  test("lists the posts with whether their token matched, and clears the list on request", async () => {
    const stand = standIn();
    stand.folderPage("init=1");
    const request = new Request("http://hiroba.test/ajax/myfavorite_song.php", {
      method: "POST",
      headers: { "x-requested-with": "XMLHttpRequest" },
    });
    stand.editor.record(
      "/ajax/myfavorite_song.php",
      request,
      new URLSearchParams({ _tckt: stand.session.ticket ?? "" }),
      stand.session,
    );
    const posts = await stand.editor.hook("/__favorites-posts", new URLSearchParams())?.json();
    expect(posts).toMatchObject([
      {
        path: "/ajax/myfavorite_song.php",
        xRequestedWith: "XMLHttpRequest",
        fields: ["_tckt"],
        ticketMatched: true,
      },
    ]);
    const cleared = await stand.editor
      .hook("/__favorites-posts", new URLSearchParams("reset=1"))
      ?.json();
    expect(cleared).toEqual([]);
  });

  test("leaves a path that is none of its own", () => {
    expect(standIn().editor.hook("/__profile", new URLSearchParams())).toBeNull();
  });
});
