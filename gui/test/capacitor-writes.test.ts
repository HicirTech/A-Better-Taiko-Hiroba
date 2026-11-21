import { beforeEach, describe, expect, test } from "bun:test";
import { FOLDER_SLOT_COUNT } from "@abth/core";
import { CONTROL } from "../scripts/mock-controls";

import {
  COSTUME_FIELDS,
  createCostumeEditor,
  type MockSession,
  type PostRecord,
} from "../scripts/mock-costume";
import { createFavoritesEditor } from "../scripts/mock-favorites";
import { BAD_VALUE_MESSAGE, createGameSettingsEditor } from "../scripts/mock-game-settings";
import { appSettingsOf, INITIAL_GAME_SETTINGS } from "../scripts/mock-game-settings-lists";
import {
  createProfileEditor,
  FILTER_MESSAGE,
  INITIAL_PROFILE,
  OWNED_TITLES,
  REFUSED_NAME,
} from "../scripts/mock-profile";
import type { FolderNames, HirobaSessionPort } from "../src/shared/session-port";
import { native } from "./capacitor-fakes";
import {
  CLOSE_LABEL,
  HIROBA,
  memoryFlag,
  profilePage,
  signOutAndIn,
  until,
} from "./capacitor-port-fixtures";
import { START_SET, standIn } from "./hiroba-stand-in";
import { createFakeIndexedDb, type FakeIndexedDb } from "./indexeddb-fake";
import { memoryStorage } from "./storage-fakes";

const { createCapacitorPort } = await import("../src/platform/capacitor");

const OWNER = "000000000000";
const NOON_JST = () => new Date("2026-09-27T03:00:00Z");
const IN_THE_BREAK = () => new Date("2026-09-26T20:30:00Z");
const TARGET = { ...START_SET, colorFace: 3 };
const CHANGE = { expected: START_SET, target: TARGET };
/** A costume write where none has been made for real: both of my page's reads. */
const SIX_REQUESTS = [
  "GET /mypage_top.php",
  "GET /mypage_kisekae.php",
  "POST /ajax/check_ip_kisekae.php",
  "POST /ajax/change_mydon.php",
  "GET /mypage_kisekae.php",
  "GET /mypage_top.php",
];
const FLUSH = "deleteCookie abth-save";

interface SetUpOptions {
  /** The page's IndexedDB; null for a port that has none. */
  indexedDb?: FakeIndexedDb | null;
  now?: () => Date;
  signedIn?: boolean;
}

function setUp(options: SetUpOptions = {}) {
  const editor = createCostumeEditor();
  const profile = createProfileEditor({ issue: editor.issueTicket });
  const favorites = createFavoritesEditor({ issue: editor.issueTicket });
  const gameSettings = createGameSettingsEditor({ issue: editor.issueTicket });
  const session: MockSession = { cardChosen: true };
  const hiroba = standIn({
    editor,
    profile,
    favorites,
    gameSettings,
    session,
    myPage: profilePage(profile),
  });
  const indexedDb = options.indexedDb === undefined ? createFakeIndexedDb() : options.indexedDb;
  const storage = memoryStorage();
  const launch = () =>
    createCapacitorPort({
      closeLabel: () => CLOSE_LABEL,
      signedInFlag: memoryFlag(options.signedIn ?? true),
      ...(indexedDb !== null && { indexedDb: indexedDb.factory }),
      storage,
      now: options.now ?? NOON_JST,
    });
  const sent = () =>
    native.httpRequests.map(({ method, url }) => `${method} ${new URL(url).pathname}`);
  const posts = async () =>
    (await editor.hook(CONTROL.posts, new URLSearchParams())?.json()) as PostRecord[];
  const saved = async () =>
    (await editor.hook(CONTROL.state, new URLSearchParams())?.json()) as Record<string, number>;
  const hook = (path: string, query = "") => editor.hook(path, new URLSearchParams(query));
  const profileHook = (path: string, query = "") => profile.hook(path, new URLSearchParams(query));
  const profilePosts = async () =>
    (await profileHook(CONTROL.profilePosts)?.json()) as PostRecord[];
  const settingsHook = (path: string, query: Record<string, string> = {}) =>
    gameSettings.hook(path, new URLSearchParams(query));
  const settingsPosts = async () =>
    (await settingsHook(CONTROL.gameSettingsPosts)?.json()) as PostRecord[];
  return {
    editor,
    profile,
    gameSettings,
    settingsHook,
    settingsPosts,
    session,
    hiroba,
    indexedDb,
    launch,
    sent,
    posts,
    profilePosts,
    saved,
    hook,
    profileHook,
  };
}

async function signedInPort(world: ReturnType<typeof setUp>) {
  const port = await world.launch();
  await port.readProfile();
  native.httpRequests.length = 0;
  native.cookieCalls.length = 0;
  return port;
}

describe("createCapacitorPort's costume writes", () => {
  beforeEach(() => native.reset());

  test("sends a change as the six requests a platform not yet checked sends, the posts as the site's script does", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    const outcome = await port.changeCostume(CHANGE);

    expect(outcome.kind).toBe("applied");
    expect(world.sent()).toEqual(SIX_REQUESTS);
    expect(await world.posts()).toEqual([
      expect.objectContaining({
        path: "/ajax/check_ip_kisekae.php",
        xRequestedWith: "XMLHttpRequest",
        origin: HIROBA,
        referer: `${HIROBA}/mypage_kisekae.php`,
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        fields: ["_tckt", ...COSTUME_FIELDS],
        ticketMatched: true,
      }),
      expect.objectContaining({
        path: "/ajax/change_mydon.php",
        xRequestedWith: "XMLHttpRequest",
        origin: HIROBA,
        referer: `${HIROBA}/mypage_kisekae.php`,
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        fields: ["_tckt", ...COSTUME_FIELDS],
        ticketMatched: true,
      }),
    ]);
    expect((await world.saved()).color_face).toBe(3);
    expect(native.cookieCalls).toEqual([FLUSH]);
  });

  test("signed out while a request is on its way, sends nothing after it and saves nothing", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    const answer = native.httpAnswer;
    let release: () => void = () => undefined;
    native.httpAnswer = () => {
      // Answered for the request just made; the first is held back until the sign-out.
      const answered = answer();
      return native.httpRequests.length === 1
        ? new Promise((resolve) => {
            release = () => resolve(answered);
          })
        : answered;
    };
    const saving = port.changeCostume(CHANGE);
    await until(() => native.httpRequests.length === 1);
    await port.signOut();
    release();

    expect(await saving).toMatchObject({ kind: "readFailed", failure: { kind: "cancelled" } });
    expect(world.sent()).toEqual(["GET /mypage_top.php"]);
    expect(await world.posts()).toEqual([]);
  });

  test("a session Hiroba ends after the save is dropped, and the cookies with it", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    world.hook(CONTROL.expireOnSave);
    const outcome = await port.changeCostume(CHANGE);

    expect(outcome).toMatchObject({ kind: "sessionGone", writeMayHaveHappened: true });
    expect(native.cookieCalls).toEqual(["clearAllCookies", FLUSH]);
    expect(await port.isSignedIn()).toBe(false);
  });

  test("writes the cookie store to disk after every write that ends, whatever it came to", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    const flushes = () => native.cookieCalls.filter((call) => call === FLUSH).length;

    world.hook(CONTROL.noopSave);
    expect((await port.changeCostume(CHANGE)).kind).toBe("notApplied");
    expect(flushes()).toBe(1);

    expect((await port.changeCostume(CHANGE)).kind).toBe("applied");
    expect(flushes()).toBe(2);

    expect((await port.openCostumeEditor()).ok).toBe(true);
    expect(flushes()).toBe(3);
  });

  test("sends nothing in Hiroba's daily break", async () => {
    const world = setUp({ now: IN_THE_BREAK });
    const port = await signedInPort(world);
    expect(await port.changeCostume(CHANGE)).toEqual({ kind: "maintenance" });
    expect(world.sent()).toEqual([]);
  });

  test("sends a write whatever the storage does with the history: it will not write, or open, or is not there", async () => {
    const refusing = createFakeIndexedDb();
    const written = setUp({ indexedDb: refusing });
    const withWrites = await signedInPort(written);
    refusing.faults.writes = true;
    expect((await withWrites.changeCostume(CHANGE)).kind).toBe("applied");
    expect(written.sent()).toEqual(SIX_REQUESTS);

    const unopenable = createFakeIndexedDb();
    unopenable.faults.open = true;
    const opened = setUp({ indexedDb: unopenable });
    const port = await signedInPort(opened);
    expect((await port.changeCostume(CHANGE)).kind).toBe("applied");
    expect(opened.sent()).toEqual(SIX_REQUESTS);

    const none = setUp({ indexedDb: null });
    expect((await (await signedInPort(none)).changeCostume(CHANGE)).kind).toBe("applied");
    expect(none.sent()).toEqual(SIX_REQUESTS);
  });

  test("sends nothing while signed out, and reads no costume editor", async () => {
    const world = setUp({ signedIn: false });
    const port = await world.launch();
    expect(await port.changeCostume(CHANGE)).toEqual({ kind: "notSignedIn" });
    expect(await port.openCostumeEditor()).toEqual({ ok: false, error: { kind: "notSignedIn" } });
    expect(world.sent()).toEqual([]);
  });
});

describe("createCapacitorPort's folder history", () => {
  beforeEach(() => native.reset());

  /** The stand-in's folder at the start. */
  const START_FOLDER = ["1001", "1008", "1014", "1020", "1031", "1026"];
  const FEWER = ["1001", "1008"];

  const syncFolder = async (
    port: Awaited<ReturnType<typeof signedInPort>>,
    target: string[],
    names?: FolderNames,
  ) => {
    const opened = await port.openFavorites();
    if (!opened.ok) {
      throw new Error("The favourites did not open");
    }
    return port.changeFolder({
      expected: opened.value.folder.state,
      target,
      ...(names && { names }),
    });
  };

  test("keeps the folder a sync saved and the one before it, at the sync's time, across launches", async () => {
    const world = setUp();
    const port = await signedInPort(world);

    expect((await syncFolder(port, FEWER)).kind).toBe("applied");

    const keptAt = NOON_JST().getTime();
    const history = await port.folderHistory();
    expect(history).toEqual([
      { songs: FEWER, keptAt, setName: null },
      { songs: START_FOLDER, keptAt, setName: null },
    ]);
    const relaunched = await world.launch();
    await relaunched.readProfile();
    expect(await relaunched.folderHistory()).toEqual(history);
  });

  test("keeps nothing for a sync that changes nothing", async () => {
    const world = setUp();
    const port = await signedInPort(world);

    expect((await syncFolder(port, START_FOLDER)).kind).toBe("nothingToChange");

    expect(await port.folderHistory()).toEqual([]);
  });

  test("is empty when the page has no IndexedDB, and the sync lands all the same", async () => {
    const world = setUp({ indexedDb: null });
    const port = await signedInPort(world);

    expect((await syncFolder(port, FEWER)).kind).toBe("applied");

    expect(await port.folderHistory()).toEqual([]);
  });
});

describe("createCapacitorPort's costume history", () => {
  beforeEach(() => native.reset());

  const PICTURE = /^data:image\/png;base64,/;

  test("keeps the history in IndexedDB with the pictures of the previews it served, across launches", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    await port.previewCostume(START_SET);
    await port.previewCostume(TARGET);
    await port.changeCostume(CHANGE);

    const history = await port.costumeHistory();
    expect(history.map(({ set }) => set)).toEqual([TARGET, START_SET]);
    expect(history.map(({ picture }) => picture !== null && PICTURE.test(picture))).toEqual([
      true,
      true,
    ]);
    expect([...(world.indexedDb?.tables.get("histories")?.keys() ?? [])]).toEqual([OWNER]);

    const relaunched = await world.launch();
    await relaunched.readProfile();
    expect(await relaunched.costumeHistory()).toEqual(history);
  });

  test("answers at once while a write waits on its pre-check, and sends nothing", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    await port.changeCostume(CHANGE);
    native.httpRequests.length = 0;
    world.hook(CONTROL.holdPrecheck, "on=1");
    const writing = port.changeCostume({ expected: TARGET, target: START_SET });
    await until(() => world.sent().includes("POST /ajax/check_ip_kisekae.php"));
    const sentInTheWrite = world.sent().length;

    const history = await port.costumeHistory();

    expect(history.map(({ set }) => set)).toEqual([TARGET, START_SET]);
    expect(world.sent()).toHaveLength(sentInTheWrite);
    world.hook(CONTROL.holdPrecheck, "on=0");
    expect((await writing).kind).toBe("applied");
  });

  test("keeps no picture for a preview fetched before the session ended", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    await port.previewCostume(TARGET);

    await signOutAndIn(port);
    await port.readProfile();
    await port.changeCostume(CHANGE);

    expect(await port.costumeHistory()).toEqual([
      { set: TARGET, picture: null },
      { set: START_SET, picture: null },
    ]);
  });

  test("is empty when the page has no IndexedDB, and breaks nothing", async () => {
    const world = setUp({ indexedDb: null });
    const port = await signedInPort(world);

    expect(await port.costumeHistory()).toEqual([]);
  });

  test("is empty while signed out", async () => {
    const world = setUp({ signedIn: false });
    const port = await world.launch();

    expect(await port.costumeHistory()).toEqual([]);
  });
});

describe("createCapacitorPort when Hiroba cannot be reached", () => {
  beforeEach(() => native.reset());

  const unreachable = () => Promise.reject({ code: "UnknownHostException" });

  test("answers my page as last read, then what the device keeps for its player", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    await port.previewCostume(TARGET);
    await port.changeCostume(CHANGE);
    const history = await port.costumeHistory();
    native.httpAnswer = unreachable;
    const offline = await world.launch();

    expect(await offline.readProfile()).toEqual({ ok: false, error: { kind: "unreachable" } });
    expect(await offline.costumeHistory()).toEqual([]);
    expect(await offline.keptProfile()).toMatchObject({
      nickname: INITIAL_PROFILE.nickname,
      medal: null,
    });
    expect(await offline.costumeHistory()).toEqual(history);
  });

  test("asks Hiroba as that player once it answers again, and never ends the session", async () => {
    const world = setUp();
    await signedInPort(world);
    const answering = native.httpAnswer;
    native.httpAnswer = unreachable;
    const offline = await world.launch();
    await offline.readProfile();
    await offline.keptProfile();
    native.httpAnswer = answering;
    native.httpRequests.length = 0;

    expect(await offline.readScores()).not.toEqual({ ok: false, error: { kind: "notSignedIn" } });
    expect(world.sent().length).toBeGreaterThan(0);
    expect(await offline.isSignedIn()).toBe(true);
  });
});

const START_TITLE = INITIAL_PROFILE.title;
const ownedTitle = (id: number) => {
  const found = OWNED_TITLES.find((one) => one.id === id);
  if (found === undefined) {
    throw new Error(`The mock owns no title ${id}`);
  }
  return found;
};
const TITLE_CHANGE = {
  expected: { title: START_TITLE },
  target: { id: 102, title: ownedTitle(102).label },
};
/** A title write where none has been made for real: the costume read both ways. */
const TITLE_SIX_REQUESTS = [
  "GET /mypage_kisekae.php",
  "GET /mypage_title_edit.php",
  "POST /ajax/check_ip_title.php",
  "POST /ajax/change_mydon_profile.php",
  "GET /mypage_top.php",
  "GET /mypage_kisekae.php",
];

describe("createCapacitorPort's title writes", () => {
  beforeEach(() => native.reset());

  test("reads the title page with one GET, and leaves its token with the platform", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    const opened = await port.openTitleEditor();

    expect(world.sent()).toEqual(["GET /mypage_title_edit.php"]);
    expect(opened.ok && opened.value.state).toEqual({ title: START_TITLE });
    expect(opened.ok && opened.value.options).toEqual(OWNED_TITLES);
    expect(opened.ok && Object.keys(opened.value)).toEqual(["state", "options"]);
    const handedOut = (await world.hook(CONTROL.tickets)?.json()) as string[];
    expect(handedOut.some((ticket) => JSON.stringify(opened).includes(ticket))).toBe(false);
    expect(native.cookieCalls).toEqual([FLUSH]);
  });

  test("sends a change as the six requests a platform not yet checked sends, the posts as the page's script does", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    const outcome = await port.changeTitle(TITLE_CHANGE);

    expect(outcome.kind).toBe("applied");
    expect(world.sent()).toEqual(TITLE_SIX_REQUESTS);
    expect(world.profile.title()).toBe(ownedTitle(102).label);
    const shared = {
      xRequestedWith: "XMLHttpRequest",
      origin: HIROBA,
      referer: `${HIROBA}/mypage_title_edit.php`,
      contentType: "application/x-www-form-urlencoded; charset=UTF-8",
      accept: "application/json, text/javascript, */*; q=0.01",
    };
    expect(await world.profilePosts()).toEqual([
      // The pre-check carries no token, as the page's script sends none.
      expect.objectContaining({
        ...shared,
        path: "/ajax/check_ip_title.php",
        fields: ["mode", "newTitle"],
        values: { mode: "title", newTitle: "102" },
        ticketMatched: false,
      }),
      expect.objectContaining({
        ...shared,
        path: "/ajax/change_mydon_profile.php",
        fields: ["newTitle", "_tckt", "mode", "getStatus"],
        values: { newTitle: "102", mode: "title", getStatus: "1" },
        ticketMatched: true,
      }),
    ]);
    expect(native.cookieCalls).toEqual([FLUSH]);
  });

  test("stops at a pre-check that is not the plain false, and saves nothing", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    world.profileHook(CONTROL.titlePrecheck, "answer=true");

    expect((await port.changeTitle(TITLE_CHANGE)).kind).toBe("needsConfirmation");
    expect(
      world.sent().filter((request) => request === "POST /ajax/change_mydon_profile.php"),
    ).toEqual([]);
    expect(world.profile.title()).toBe(START_TITLE);
  });
});

const START_NAME = INITIAL_PROFILE.nickname;
const NEW_NAME = "あたらしい";
const NAME_CHANGE = {
  expected: { nickname: START_NAME },
  target: { nickname: NEW_NAME },
};
/** A rename where none has been made for real: my page read around the one save, no pre-check. */
const NAME_FIVE_REQUESTS = [
  "GET /mypage_top.php",
  "GET /mypage_top.php",
  "POST /ajax/change_mydon_profile.php",
  "GET /mypage_top.php",
  "GET /mypage_top.php",
];

describe("createCapacitorPort's name writes", () => {
  beforeEach(() => native.reset());

  test("sends a change as the five requests a platform not yet checked sends, with no pre-check, the post as the dialog's script does", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    const outcome = await port.changeName(NAME_CHANGE);

    expect(outcome.kind).toBe("applied");
    expect(world.sent()).toEqual(NAME_FIVE_REQUESTS);
    expect(world.profile.nickname()).toBe(NEW_NAME);
    expect(await world.profilePosts()).toEqual([
      expect.objectContaining({
        path: "/ajax/change_mydon_profile.php",
        xRequestedWith: "XMLHttpRequest",
        origin: HIROBA,
        referer: `${HIROBA}/mypage_top.php`,
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        accept: "application/json, text/javascript, */*; q=0.01",
        fields: ["_tckt", "mode", "oldName", "newName"],
        values: { mode: "name", oldName: START_NAME, newName: NEW_NAME },
        ticketMatched: true,
      }),
    ]);
    expect(native.cookieCalls).toEqual([FLUSH]);
  });

  test("shows a name the filter refuses with Hiroba's words", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    const outcome = await port.changeName({ ...NAME_CHANGE, target: { nickname: REFUSED_NAME } });

    expect(outcome).toMatchObject({
      kind: "notApplied",
      reason: { kind: "refused", code: 1, message: FILTER_MESSAGE },
    });
    expect(world.profile.nickname()).toBe(START_NAME);
  });

  test("refuses every name unsent while my page says renames are closed", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    world.profileHook(CONTROL.rename, "state=closed");

    expect(await port.changeName(NAME_CHANGE)).toEqual({
      kind: "invalidTarget",
      field: "name.closed",
    });
    expect(world.sent()).toEqual(["GET /mypage_top.php", "GET /mypage_top.php"]);
    expect(await world.profilePosts()).toEqual([]);
  });
});

const SHOWN_SETTINGS = appSettingsOf(INITIAL_GAME_SETTINGS);
const SETTINGS_CHANGE = {
  expected: SHOWN_SETTINGS,
  target: { ...SHOWN_SETTINGS, region: "TWN", speed: "35" },
};
const SETTINGS_REQUESTS = [
  "GET /mypage_other_setting.php",
  "POST /ajax/mypage_other.php",
  "GET /mypage_other_setting.php",
];
/** The page's form serialised, then what its script adds. */
const SETTINGS_POST_FIELDS = [
  "_tckt",
  "area_id",
  "country_code",
  "open_status",
  "disp_achievement",
  "disp_achievement_type",
  "dan_disp",
  "op1",
  "op2",
  "op3",
  "op4",
  "skip",
  "notes_position",
  "voice",
  "default_tone_setting",
  "default_tone_setting",
  "double_song_disp",
  "select_double_song_disp",
  "applicable_flg",
  "default_difficulty_course",
  "select_default_difficulty_course",
  "default_difficulty_star",
  "select_default_difficulty_star",
  "default_difficulty_sort",
  "select_default_difficulty_sort",
  "disp_level_self",
  "disp_level_chassis",
  "op1",
  "op2",
  "op3",
  "op4",
  "notes_position",
];

describe("createCapacitorPort's game settings writes", () => {
  beforeEach(() => native.reset());

  test("reads the settings page with one GET, and leaves its token with the platform", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    const opened = await port.openGameSettings();

    expect(world.sent()).toEqual(["GET /mypage_other_setting.php"]);
    expect(opened.ok && opened.value.state).toEqual(SHOWN_SETTINGS);
    expect(opened.ok && Object.keys(opened.value)).toEqual([
      "state",
      "choices",
      "doubleChartsLocked",
    ]);
    const handedOut = (await world.hook(CONTROL.tickets)?.json()) as string[];
    expect(handedOut.some((ticket) => JSON.stringify(opened).includes(ticket))).toBe(false);
    expect(native.cookieCalls).toEqual([FLUSH]);
  });

  test("sends a change as three requests with no pre-check, the post as the page's script does", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    const outcome = await port.changeGameSettings(SETTINGS_CHANGE);

    expect(outcome).toMatchObject({ kind: "applied", after: SETTINGS_CHANGE.target });
    expect(world.sent()).toEqual(SETTINGS_REQUESTS);
    expect(world.gameSettings.state()).toMatchObject({ country_code: "TWN", op1: "35" });
    expect(await world.settingsPosts()).toEqual([
      expect.objectContaining({
        path: "/ajax/mypage_other.php",
        xRequestedWith: "XMLHttpRequest",
        origin: HIROBA,
        referer: `${HIROBA}/mypage_other_setting.php`,
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        accept: "application/json, text/javascript, */*; q=0.01",
        fields: SETTINGS_POST_FIELDS,
        ticketMatched: true,
      }),
    ]);
    expect(native.cookieCalls).toEqual([FLUSH]);
  });

  test("shows a value Hiroba refuses with its words, and the settings read back", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    world.settingsHook(CONTROL.gameSettingsNextResult, { code: "25", message: BAD_VALUE_MESSAGE });

    expect(await port.changeGameSettings(SETTINGS_CHANGE)).toMatchObject({
      kind: "notApplied",
      reason: { kind: "refused", code: 25, message: BAD_VALUE_MESSAGE },
      after: SHOWN_SETTINGS,
    });
    expect(world.sent()).toEqual(SETTINGS_REQUESTS);
  });
});

const HELD_WRITES = {
  costume: {
    start: (port: HirobaSessionPort) => port.changeCostume(CHANGE),
    hold: (world: ReturnType<typeof setUp>, on: 0 | 1) =>
      world.hook(CONTROL.holdPrecheck, `on=${on}`),
    heldAt: "POST /ajax/check_ip_kisekae.php",
    requests: SIX_REQUESTS,
  },
  title: {
    start: (port: HirobaSessionPort) => port.changeTitle(TITLE_CHANGE),
    hold: (world: ReturnType<typeof setUp>, on: 0 | 1) =>
      world.profileHook(CONTROL.titleHoldPrecheck, `on=${on}`),
    heldAt: "POST /ajax/check_ip_title.php",
    requests: TITLE_SIX_REQUESTS,
  },
  name: {
    start: (port: HirobaSessionPort) => port.changeName(NAME_CHANGE),
    hold: (world: ReturnType<typeof setUp>, on: 0 | 1) =>
      world.profileHook(CONTROL.profileHoldSave, `on=${on}`),
    heldAt: "POST /ajax/change_mydon_profile.php",
    requests: NAME_FIVE_REQUESTS,
  },
  gameSettings: {
    start: (port: HirobaSessionPort) => port.changeGameSettings(SETTINGS_CHANGE),
    hold: (world: ReturnType<typeof setUp>, on: 0 | 1) =>
      world.settingsHook(CONTROL.gameSettingsHoldSave, { on: String(on) }),
    heldAt: "POST /ajax/mypage_other.php",
    requests: SETTINGS_REQUESTS,
  },
} as const;

describe.each(Object.keys(HELD_WRITES) as (keyof typeof HELD_WRITES)[])(
  "createCapacitorPort while a %s write waits mid-way",
  (kind) => {
    beforeEach(() => native.reset());
    const held = HELD_WRITES[kind];

    async function holdWrite(world: ReturnType<typeof setUp>, port: HirobaSessionPort) {
      held.hold(world, 1);
      const writing = held.start(port);
      await until(() => world.sent().includes(held.heldAt));
      return { writing, release: () => held.hold(world, 0) };
    }

    test("a picture asked for meanwhile, which the device does not keep, is fetched after the read-back", async () => {
      const world = setUp();
      const port = await signedInPort(world);
      await port.openCostumeEditor();
      native.httpRequests.length = 0;
      const { writing, release } = await holdWrite(world, port);
      const requestsInTheWrite = world.sent().length;

      const picture = port.readPicture({ kind: "costumeItem", slot: 1, id: 4 });
      await Bun.sleep(300);
      expect(world.sent()).toHaveLength(requestsInTheWrite);

      release();
      expect((await writing).kind).toBe("applied");
      expect((await picture).ok).toBe(true);
      expect(world.sent()).toEqual([...held.requests, "GET /imgsrc_kisekae.php"]);
    });
  },
);

describe("createCapacitorPort's cookie store", () => {
  beforeEach(() => native.reset());

  type SavingCall = [
    verb: keyof HirobaSessionPort,
    call: (port: Awaited<ReturnType<typeof signedInPort>>) => Promise<unknown>,
  ];
  const EMPTY_FOLDER = { slots: Array.from({ length: FOLDER_SLOT_COUNT }, () => null) };

  test.each<SavingCall>([
    ["openCostumeEditor", (port) => port.openCostumeEditor()],
    ["openTitleEditor", (port) => port.openTitleEditor()],
    ["previewCostume", (port) => port.previewCostume(TARGET)],
    ["changeCostume", (port) => port.changeCostume(CHANGE)],
    ["changeTitle", (port) => port.changeTitle(TITLE_CHANGE)],
    ["changeName", (port) => port.changeName(NAME_CHANGE)],
    ["openFavorites", (port) => port.openFavorites()],
    ["changeFolder", (port) => port.changeFolder({ expected: EMPTY_FOLDER, target: ["1001"] })],
    [
      "changeFavoriteSong",
      (port) =>
        port.changeFavoriteSong({
          expected: { songNo: null, ura: false },
          target: { songNo: "1001", ura: false },
        }),
    ],
    ["readSongPicker", (port) => port.readSongPicker()],
    ["openGameSettings", (port) => port.openGameSettings()],
    ["changeGameSettings", (port) => port.changeGameSettings(SETTINGS_CHANGE)],
    ["refreshHiroba", (port) => port.refreshHiroba()],
    ["readScores", (port) => port.readScores()],
    ["readEveryScore", (port) => port.readEveryScore()],
    ["readSongScores", (port) => port.readSongScores("1001", null)],
  ])("writes the cookie store to disk after %s, whatever it came to", async (_verb, call) => {
    const port = await signedInPort(setUp());
    await call(port);

    expect(native.cookieCalls).toEqual([FLUSH]);
  });

  test("writes the cookie store to disk only once a preview's answer has come", async () => {
    const port = await signedInPort(setUp());
    const answer = native.httpAnswer;
    let release: () => void = () => undefined;
    native.httpAnswer = () => {
      // Answered for the preview as it is asked, and held back until released.
      const answered = answer();
      return new Promise((resolve) => {
        release = () => resolve(answered);
      });
    };
    const previewing = port.previewCostume(TARGET);
    await until(() => native.httpRequests.length === 1);
    expect(native.cookieCalls).toEqual([]);

    release();

    expect((await previewing).ok).toBe(true);
    expect(native.cookieCalls).toEqual([FLUSH]);
  });
});
