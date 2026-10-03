import { beforeEach, describe, expect, test } from "bun:test";

import {
  COSTUME_FIELDS,
  createCostumeEditor,
  type MockSession,
  type PostRecord,
} from "../scripts/mock-costume";
import {
  createProfileEditor,
  FILTER_MESSAGE,
  INITIAL_PROFILE,
  OWNED_TITLES,
  REFUSED_NAME,
} from "../scripts/mock-profile";
import type { HirobaSessionPort, VerbsQueued } from "../src/session-port";
import {
  CLOSE_LABEL,
  HIROBA,
  memoryFlag,
  MY_PAGE,
  profilePage,
  until,
} from "./android-port-fixtures";
import { native } from "./capacitor-fakes";
import { START_SET, standIn } from "./hiroba-stand-in";
import { createFakeIndexedDb, type FakeIndexedDb } from "./indexeddb-fake";

const { createAndroidPort } = await import("../src/platform/android");

const OWNER = "000000000000";
const OTHER = "111111111111";
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
  const session: MockSession = { cardChosen: true };
  const hiroba = standIn({ editor, profile, session, myPage: profilePage(profile) });
  const indexedDb = options.indexedDb === undefined ? createFakeIndexedDb() : options.indexedDb;
  const launch = () =>
    createAndroidPort({
      closeLabel: () => CLOSE_LABEL,
      signedInFlag: memoryFlag(options.signedIn ?? true),
      ...(indexedDb !== null && { indexedDb: indexedDb.factory }),
      now: options.now ?? NOON_JST,
    });
  const sent = () =>
    native.httpRequests.map(({ method, url }) => `${method} ${new URL(url).pathname}`);
  const posts = async () =>
    (await editor.hook("/__posts", new URLSearchParams())?.json()) as PostRecord[];
  const saved = async () =>
    (await editor.hook("/__state", new URLSearchParams())?.json()) as Record<string, number>;
  const hook = (path: string, query = "") => editor.hook(path, new URLSearchParams(query));
  const profileHook = (path: string, query = "") => profile.hook(path, new URLSearchParams(query));
  const profilePosts = async () => (await profileHook("/__profile-posts")?.json()) as PostRecord[];
  const slots = () => new Map(indexedDb?.tables.get("slots") ?? []);
  return {
    editor,
    profile,
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
    slots,
  };
}

async function signedInPort(world: ReturnType<typeof setUp>) {
  const port = await world.launch();
  await port.readProfile();
  native.httpRequests.length = 0;
  native.cookieCalls.length = 0;
  return port;
}

describe("createAndroidPort's costume writes", () => {
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

  test("keeps the undo in IndexedDB, offers it, and an undo puts the whole set back and empties it", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    await port.changeCostume(CHANGE);

    expect([...world.slots().keys()]).toEqual([`costume/${OWNER}`]);
    expect(await port.pendingUndo()).toEqual([
      { kind: "costume", at: NOON_JST().toISOString(), before: START_SET, after: TARGET },
    ]);

    native.httpRequests.length = 0;
    expect((await port.undo("costume")).kind).toBe("applied");
    expect(world.sent()).toEqual(SIX_REQUESTS);
    expect(await world.saved()).toMatchObject({ color_face: START_SET.colorFace });
    expect(await port.pendingUndo()).toEqual([]);
    expect(world.slots().size).toBe(0);
  });

  test("keeps the pending write before the first post, so an app killed in the middle still finds it", async () => {
    const world = setUp();
    const first = await signedInPort(world);
    world.hook("/__hold-precheck", "on=1");
    void first.changeCostume(CHANGE);
    await until(() => world.sent().includes("POST /ajax/check_ip_kisekae.php"));
    expect(world.slots().get(`costume/${OWNER}`)).toMatchObject({
      v: 1,
      slot: { record: null, pending: { before: START_SET, expectedAfter: TARGET } },
    });
    // The save, which had gone out before the kill, landed all the same.
    world.hook("/__state", "color_face=3");

    const relaunched = await world.launch();
    await relaunched.readProfile();
    expect(await relaunched.pendingUndo()).toEqual([]);
    await relaunched.openCostumeEditor();
    expect(await relaunched.pendingUndo()).toMatchObject([{ before: START_SET, after: TARGET }]);
  });

  test("a session Hiroba ends after the save is dropped, the pending write kept, and settled at the next read", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    world.hook("/__expire-on-save");
    const outcome = await port.changeCostume(CHANGE);

    expect(outcome).toMatchObject({ kind: "sessionGone", writeMayHaveHappened: true });
    expect(native.cookieCalls).toEqual(["clearAllCookies", FLUSH]);
    expect(await port.isSignedIn()).toBe(false);
    expect(world.slots().get(`costume/${OWNER}`)).toMatchObject({ slot: { pending: {} } });

    world.hiroba.restore();
    const relaunched = await world.launch();
    await relaunched.readProfile();
    await relaunched.openCostumeEditor();
    expect(await relaunched.pendingUndo()).toMatchObject([{ before: START_SET, after: TARGET }]);
  });

  test("keeps another card's undo apart, and offers this card none of it", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    await port.changeCostume(CHANGE);

    standIn({
      editor: world.editor,
      session: world.session,
      myPage: MY_PAGE.replace(OWNER, OTHER),
    });
    const theirs = await world.launch();
    await theirs.readProfile();
    expect(await theirs.pendingUndo()).toEqual([]);
    expect(await theirs.undo("costume")).toEqual({ kind: "nothingToUndo" });
    expect([...world.slots().keys()]).toEqual([`costume/${OWNER}`]);
  });

  test("writes the cookie store to disk after every write that ends, whatever it came to", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    const flushes = () => native.cookieCalls.filter((call) => call === FLUSH).length;

    world.hook("/__noop-save");
    expect((await port.changeCostume(CHANGE)).kind).toBe("notApplied");
    expect(flushes()).toBe(1);

    expect((await port.changeCostume(CHANGE)).kind).toBe("applied");
    expect(flushes()).toBe(2);

    expect((await port.undo("costume")).kind).toBe("applied");
    expect(flushes()).toBe(3);

    expect(await port.undo("costume")).toEqual({ kind: "nothingToUndo" });
    expect(flushes()).toBe(4);

    expect((await port.openCostumeEditor()).ok).toBe(true);
    expect(flushes()).toBe(5);
  });

  test("answers a second write busy at once, sends nothing for it, and holds a picture back until the first has read back", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    await port.openCostumeEditor();
    native.httpRequests.length = 0;
    world.hook("/__hold-precheck", "on=1");

    const writing = port.changeCostume(CHANGE);
    await until(() => world.sent().includes("POST /ajax/check_ip_kisekae.php"));
    const requestsInTheWrite = world.sent().length;
    expect(await port.changeCostume(CHANGE)).toEqual({ kind: "busy" });
    expect(await port.undo("costume")).toEqual({ kind: "busy" });
    const picture = port.readPicture({ kind: "costumeItem", slot: 1, id: 4 });
    await Bun.sleep(300);
    expect(world.sent()).toHaveLength(requestsInTheWrite);

    world.hook("/__hold-precheck", "on=0");
    expect((await writing).kind).toBe("applied");
    expect((await picture).ok).toBe(true);
    expect(world.sent()).toEqual([...SIX_REQUESTS, "GET /imgsrc_kisekae.php"]);
  });

  test("sends nothing in Hiroba's daily break", async () => {
    const world = setUp({ now: IN_THE_BREAK });
    const port = await signedInPort(world);
    expect(await port.changeCostume(CHANGE)).toEqual({ kind: "maintenance" });
    expect(world.sent()).toEqual([]);
  });

  test("refuses a target with a key the site has no field for, before anything is sent", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    const asked = port.changeCostume({
      expected: START_SET,
      target: { ...START_SET, extra: 1 },
    } as never);
    await expect(asked).rejects.toThrow("Refused changeCostume: arguments it does not take");
    expect(world.sent()).toEqual([]);
  });

  test("does not send a write it cannot keep the undo of: the storage that will not write, or open", async () => {
    const refusing = createFakeIndexedDb();
    const written = setUp({ indexedDb: refusing });
    const withWrites = await signedInPort(written);
    refusing.faults.writes = true;
    expect(await withWrites.changeCostume(CHANGE)).toEqual({ kind: "undoNotSaved" });
    expect(await written.posts()).toEqual([]);

    const unopenable = createFakeIndexedDb();
    unopenable.faults.open = true;
    const opened = setUp({ indexedDb: unopenable });
    const port = await signedInPort(opened);
    expect(await port.changeCostume(CHANGE)).toEqual({ kind: "undoNotSaved" });
    expect(await opened.posts()).toEqual([]);
  });

  test("does not send a write when the page has no IndexedDB at all", async () => {
    const world = setUp({ indexedDb: null });
    const port = await signedInPort(world);
    expect(await port.changeCostume(CHANGE)).toEqual({ kind: "undoNotSaved" });
    expect(await port.pendingUndo()).toEqual([]);
    expect(await world.posts()).toEqual([]);
  });

  test("sends nothing while signed out, and reads no costume editor", async () => {
    const world = setUp({ signedIn: false });
    const port = await world.launch();
    expect(await port.changeCostume(CHANGE)).toEqual({ kind: "notSignedIn" });
    expect(await port.undo("costume")).toEqual({ kind: "notSignedIn" });
    expect(await port.openCostumeEditor()).toEqual({ ok: false, error: { kind: "notSignedIn" } });
    expect(world.sent()).toEqual([]);
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

describe("createAndroidPort's title writes", () => {
  beforeEach(() => native.reset());

  test("reads the title page with one GET, and leaves its token with the platform", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    const opened = await port.openTitleEditor();

    expect(world.sent()).toEqual(["GET /mypage_title_edit.php"]);
    expect(opened.ok && opened.value.state).toEqual({ title: START_TITLE });
    expect(opened.ok && opened.value.options).toEqual(OWNED_TITLES);
    expect(opened.ok && Object.keys(opened.value)).toEqual(["state", "options"]);
    const handedOut = (await world.hook("/__tickets")?.json()) as string[];
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

  test("keeps the undo in IndexedDB, offers it, and an undo puts the previous title back and empties it", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    await port.changeTitle(TITLE_CHANGE);

    expect([...world.slots().keys()]).toEqual([`title/${OWNER}`]);
    expect(await port.pendingUndo()).toEqual([
      {
        kind: "title",
        at: NOON_JST().toISOString(),
        before: { title: START_TITLE },
        after: { title: ownedTitle(102).label },
      },
    ]);

    native.httpRequests.length = 0;
    expect((await port.undo("title")).kind).toBe("applied");
    expect(world.sent()).toEqual(TITLE_SIX_REQUESTS);
    expect(world.profile.title()).toBe(START_TITLE);
    expect(await port.pendingUndo()).toEqual([]);
    expect(world.slots().size).toBe(0);
  });

  test("refuses an undo to a name two titles share unsent, and keeps it offered", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    const shared = ownedTitle(104).label;
    world.profile.setTitle(shared);
    await port.changeTitle({
      expected: { title: shared },
      target: { id: 101, title: ownedTitle(101).label },
    });

    native.httpRequests.length = 0;
    expect(await port.undo("title")).toEqual({ kind: "invalidTarget", field: "title.ambiguous" });
    expect(world.sent().filter((request) => request.startsWith("POST"))).toEqual([]);
    expect(await port.pendingUndo()).toMatchObject([{ kind: "title", before: { title: shared } }]);
  });

  test("keeps the pending write before the first post, and a read of my page settles it after a kill", async () => {
    const world = setUp();
    const first = await signedInPort(world);
    world.profileHook("/__title-hold-precheck", "on=1");
    void first.changeTitle(TITLE_CHANGE);
    await until(() => world.sent().includes("POST /ajax/check_ip_title.php"));
    expect(world.slots().get(`title/${OWNER}`)).toMatchObject({
      v: 1,
      slot: {
        record: null,
        pending: {
          before: { title: START_TITLE },
          expectedAfter: { title: ownedTitle(102).label },
        },
      },
    });
    // The save, which had gone out before the kill, landed all the same.
    world.profileHook("/__profile", `title=${encodeURIComponent(ownedTitle(102).label)}`);

    const relaunched = await world.launch();
    expect(await relaunched.pendingUndo()).toEqual([]);
    await relaunched.readProfile();
    expect(await relaunched.pendingUndo()).toMatchObject([
      { kind: "title", before: { title: START_TITLE }, after: { title: ownedTitle(102).label } },
    ]);
  });

  test("a session Hiroba ends after the save is dropped, the pending write kept, and settled at the next read", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    world.profileHook("/__profile-expire-on-save");
    const outcome = await port.changeTitle(TITLE_CHANGE);

    expect(outcome).toMatchObject({ kind: "sessionGone", writeMayHaveHappened: true });
    expect(native.cookieCalls).toEqual(["clearAllCookies", FLUSH]);
    expect(await port.isSignedIn()).toBe(false);
    expect(world.slots().get(`title/${OWNER}`)).toMatchObject({ slot: { pending: {} } });

    world.hiroba.restore();
    const relaunched = await world.launch();
    await relaunched.readProfile();
    expect(await relaunched.pendingUndo()).toMatchObject([
      { kind: "title", before: { title: START_TITLE }, after: { title: ownedTitle(102).label } },
    ]);
  });

  test("answers a write busy while another kind's waits on its pre-check, and sends nothing for it", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    world.profileHook("/__title-hold-precheck", "on=1");

    const writing = port.changeTitle(TITLE_CHANGE);
    await until(() => world.sent().includes("POST /ajax/check_ip_title.php"));
    const requestsInTheWrite = world.sent().length;
    expect(await port.changeCostume(CHANGE)).toEqual({ kind: "busy" });
    expect(await port.changeTitle(TITLE_CHANGE)).toEqual({ kind: "busy" });
    expect(await port.undo("title")).toEqual({ kind: "busy" });
    expect(await port.undo("costume")).toEqual({ kind: "busy" });
    expect(world.sent()).toHaveLength(requestsInTheWrite);

    world.profileHook("/__title-hold-precheck", "on=0");
    expect((await writing).kind).toBe("applied");
    expect(world.sent()).toEqual(TITLE_SIX_REQUESTS);
  });

  test("keeps another card's title undo apart, and offers this card none of it", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    await port.changeTitle(TITLE_CHANGE);

    standIn({
      editor: world.editor,
      profile: world.profile,
      session: world.session,
      myPage: profilePage(world.profile, OTHER),
    });
    const theirs = await world.launch();
    await theirs.readProfile();
    expect(await theirs.pendingUndo()).toEqual([]);
    expect(await theirs.undo("title")).toEqual({ kind: "nothingToUndo" });
    expect([...world.slots().keys()]).toEqual([`title/${OWNER}`]);
  });

  test("writes the cookie store to disk after every title write that ends, whatever it came to", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    const flushes = () => native.cookieCalls.filter((call) => call === FLUSH).length;

    world.profileHook("/__profile-noop-save");
    expect((await port.changeTitle(TITLE_CHANGE)).kind).toBe("notApplied");
    expect(flushes()).toBe(1);

    expect((await port.changeTitle(TITLE_CHANGE)).kind).toBe("applied");
    expect(flushes()).toBe(2);

    expect((await port.undo("title")).kind).toBe("applied");
    expect(flushes()).toBe(3);

    expect((await port.openTitleEditor()).ok).toBe(true);
    expect(flushes()).toBe(4);
  });

  test("stops at a pre-check that is not the plain false, and saves nothing", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    world.profileHook("/__title-precheck", "answer=true");

    expect((await port.changeTitle(TITLE_CHANGE)).kind).toBe("needsConfirmation");
    expect(
      world.sent().filter((request) => request === "POST /ajax/change_mydon_profile.php"),
    ).toEqual([]);
    expect(world.profile.title()).toBe(START_TITLE);
  });

  test("sends nothing in Hiroba's daily break", async () => {
    const world = setUp({ now: IN_THE_BREAK });
    const port = await signedInPort(world);
    expect(await port.changeTitle(TITLE_CHANGE)).toEqual({ kind: "maintenance" });
    expect(world.sent()).toEqual([]);
  });

  test("refuses a target with a key the site has no field for, or a title by its name alone, before anything is sent", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    const withExtra = port.changeTitle({
      expected: TITLE_CHANGE.expected,
      target: { ...TITLE_CHANGE.target, extra: 1 },
    } as never);
    await expect(withExtra).rejects.toThrow("Refused changeTitle: arguments it does not take");
    const byName = port.changeTitle({
      expected: TITLE_CHANGE.expected,
      target: { id: null, title: ownedTitle(102).label },
    });
    await expect(byName).rejects.toThrow("Refused changeTitle: arguments it does not take");
    expect(world.sent()).toEqual([]);
  });

  test("does not send a title write it cannot keep the undo of: the storage that will not write, or open, or is not there", async () => {
    const refusing = createFakeIndexedDb();
    const written = setUp({ indexedDb: refusing });
    const withWrites = await signedInPort(written);
    refusing.faults.writes = true;
    expect(await withWrites.changeTitle(TITLE_CHANGE)).toEqual({ kind: "undoNotSaved" });
    expect(await written.profilePosts()).toEqual([]);

    const unopenable = createFakeIndexedDb();
    unopenable.faults.open = true;
    const opened = setUp({ indexedDb: unopenable });
    expect(await (await signedInPort(opened)).changeTitle(TITLE_CHANGE)).toEqual({
      kind: "undoNotSaved",
    });
    expect(await opened.profilePosts()).toEqual([]);

    const none = setUp({ indexedDb: null });
    expect(await (await signedInPort(none)).changeTitle(TITLE_CHANGE)).toEqual({
      kind: "undoNotSaved",
    });
    expect(await none.profilePosts()).toEqual([]);
  });

  test("sends nothing while signed out, and reads no title page", async () => {
    const world = setUp({ signedIn: false });
    const port = await world.launch();
    expect(await port.changeTitle(TITLE_CHANGE)).toEqual({ kind: "notSignedIn" });
    expect(await port.undo("title")).toEqual({ kind: "notSignedIn" });
    expect(await port.openTitleEditor()).toEqual({ ok: false, error: { kind: "notSignedIn" } });
    expect(world.sent()).toEqual([]);
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

describe("createAndroidPort's name writes", () => {
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

  test("keeps the undo in IndexedDB, offers it, and an undo puts the previous name back and empties it", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    await port.changeName(NAME_CHANGE);

    expect([...world.slots().keys()]).toEqual([`name/${OWNER}`]);
    expect(await port.pendingUndo()).toEqual([
      {
        kind: "name",
        at: NOON_JST().toISOString(),
        before: { nickname: START_NAME },
        after: { nickname: NEW_NAME },
      },
    ]);

    native.httpRequests.length = 0;
    expect((await port.undo("name")).kind).toBe("applied");
    expect(world.sent()).toEqual(NAME_FIVE_REQUESTS);
    expect(world.profile.nickname()).toBe(START_NAME);
    expect(await port.pendingUndo()).toEqual([]);
    expect(world.slots().size).toBe(0);
  });

  test("shows a name the filter refuses with Hiroba's words, and keeps no undo for it", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    const outcome = await port.changeName({ ...NAME_CHANGE, target: { nickname: REFUSED_NAME } });

    expect(outcome).toMatchObject({
      kind: "notApplied",
      reason: { kind: "refused", code: 1, message: FILTER_MESSAGE },
    });
    expect(world.profile.nickname()).toBe(START_NAME);
    expect(await port.pendingUndo()).toEqual([]);
    expect(world.slots().size).toBe(0);
  });

  test("keeps the record offered when Hiroba will not take the name back", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    await port.changeName(NAME_CHANGE);
    world.profileHook("/__rename-cooldown", "on=1");

    expect(await port.undo("name")).toMatchObject({
      kind: "notApplied",
      reason: { kind: "refused", code: 1 },
    });
    expect(world.profile.nickname()).toBe(NEW_NAME);
    expect(await port.pendingUndo()).toMatchObject([
      { kind: "name", before: { nickname: START_NAME }, after: { nickname: NEW_NAME } },
    ]);
  });

  test("refuses every name unsent while my page says renames are closed", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    world.profileHook("/__rename", "state=closed");

    expect(await port.changeName(NAME_CHANGE)).toEqual({
      kind: "invalidTarget",
      field: "name.closed",
    });
    expect(world.sent()).toEqual(["GET /mypage_top.php", "GET /mypage_top.php"]);
    expect(await world.profilePosts()).toEqual([]);
  });

  test("keeps the pending write before the post, and a read of my page settles it after a kill", async () => {
    const world = setUp();
    const first = await signedInPort(world);
    world.profileHook("/__profile-hold-save", "on=1");
    void first.changeName(NAME_CHANGE);
    await until(() => world.sent().includes("POST /ajax/change_mydon_profile.php"));
    expect(world.slots().get(`name/${OWNER}`)).toMatchObject({
      v: 1,
      slot: {
        record: null,
        pending: {
          before: { nickname: START_NAME },
          expectedAfter: { nickname: NEW_NAME },
        },
      },
    });
    // The save, which had gone out before the kill, landed all the same.
    world.profileHook("/__profile", `nickname=${encodeURIComponent(NEW_NAME)}`);

    const relaunched = await world.launch();
    expect(await relaunched.pendingUndo()).toEqual([]);
    await relaunched.readProfile();
    expect(await relaunched.pendingUndo()).toMatchObject([
      { kind: "name", before: { nickname: START_NAME }, after: { nickname: NEW_NAME } },
    ]);
  });

  test("a session Hiroba ends after the save is dropped, the pending write kept, and settled at the next read", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    world.profileHook("/__profile-expire-on-save");
    const outcome = await port.changeName(NAME_CHANGE);

    expect(outcome).toMatchObject({ kind: "sessionGone", writeMayHaveHappened: true });
    expect(native.cookieCalls).toEqual(["clearAllCookies", FLUSH]);
    expect(await port.isSignedIn()).toBe(false);
    expect(world.slots().get(`name/${OWNER}`)).toMatchObject({ slot: { pending: {} } });

    world.hiroba.restore();
    const relaunched = await world.launch();
    await relaunched.readProfile();
    expect(await relaunched.pendingUndo()).toMatchObject([
      { kind: "name", before: { nickname: START_NAME }, after: { nickname: NEW_NAME } },
    ]);
  });

  test("answers any other write busy while a rename waits on its save, and sends nothing for it", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    world.profileHook("/__profile-hold-save", "on=1");

    const writing = port.changeName(NAME_CHANGE);
    await until(() => world.sent().includes("POST /ajax/change_mydon_profile.php"));
    const requestsInTheWrite = world.sent().length;
    expect(await port.changeCostume(CHANGE)).toEqual({ kind: "busy" });
    expect(await port.changeTitle(TITLE_CHANGE)).toEqual({ kind: "busy" });
    expect(await port.changeName(NAME_CHANGE)).toEqual({ kind: "busy" });
    expect(await port.undo("name")).toEqual({ kind: "busy" });
    expect(await port.undo("title")).toEqual({ kind: "busy" });
    expect(world.sent()).toHaveLength(requestsInTheWrite);

    world.profileHook("/__profile-hold-save", "on=0");
    expect((await writing).kind).toBe("applied");
    expect(world.sent()).toEqual(NAME_FIVE_REQUESTS);
  });

  test("keeps another card's name undo apart, and offers this card none of it", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    await port.changeName(NAME_CHANGE);

    standIn({
      editor: world.editor,
      profile: world.profile,
      session: world.session,
      myPage: profilePage(world.profile, OTHER),
    });
    const theirs = await world.launch();
    await theirs.readProfile();
    expect(await theirs.pendingUndo()).toEqual([]);
    expect(await theirs.undo("name")).toEqual({ kind: "nothingToUndo" });
    expect([...world.slots().keys()]).toEqual([`name/${OWNER}`]);
  });

  test("writes the cookie store to disk after every rename that ends, whatever it came to", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    const flushes = () => native.cookieCalls.filter((call) => call === FLUSH).length;

    world.profileHook("/__profile-noop-save");
    expect((await port.changeName(NAME_CHANGE)).kind).toBe("notApplied");
    expect(flushes()).toBe(1);

    expect((await port.changeName(NAME_CHANGE)).kind).toBe("applied");
    expect(flushes()).toBe(2);

    expect((await port.undo("name")).kind).toBe("applied");
    expect(flushes()).toBe(3);
  });

  test("sends nothing in Hiroba's daily break", async () => {
    const world = setUp({ now: IN_THE_BREAK });
    const port = await signedInPort(world);
    expect(await port.changeName(NAME_CHANGE)).toEqual({ kind: "maintenance" });
    expect(world.sent()).toEqual([]);
  });

  test("refuses a target with a key the site has no field for, or no name, before anything is sent", async () => {
    const world = setUp();
    const port = await signedInPort(world);
    const withExtra = port.changeName({
      expected: NAME_CHANGE.expected,
      target: { nickname: NEW_NAME, extra: 1 },
    } as never);
    await expect(withExtra).rejects.toThrow("Refused changeName: arguments it does not take");
    const empty = port.changeName({ expected: NAME_CHANGE.expected, target: { nickname: "" } });
    await expect(empty).rejects.toThrow("Refused changeName: arguments it does not take");
    expect(world.sent()).toEqual([]);
  });

  test("does not send a rename it cannot keep the undo of: the storage that will not write, or open, or is not there", async () => {
    const refusing = createFakeIndexedDb();
    const written = setUp({ indexedDb: refusing });
    const withWrites = await signedInPort(written);
    refusing.faults.writes = true;
    expect(await withWrites.changeName(NAME_CHANGE)).toEqual({ kind: "undoNotSaved" });
    expect(await written.profilePosts()).toEqual([]);

    const unopenable = createFakeIndexedDb();
    unopenable.faults.open = true;
    const opened = setUp({ indexedDb: unopenable });
    expect(await (await signedInPort(opened)).changeName(NAME_CHANGE)).toEqual({
      kind: "undoNotSaved",
    });
    expect(await opened.profilePosts()).toEqual([]);

    const none = setUp({ indexedDb: null });
    expect(await (await signedInPort(none)).changeName(NAME_CHANGE)).toEqual({
      kind: "undoNotSaved",
    });
    expect(await none.profilePosts()).toEqual([]);
  });

  test("sends nothing while signed out", async () => {
    const world = setUp({ signedIn: false });
    const port = await world.launch();
    expect(await port.changeName(NAME_CHANGE)).toEqual({ kind: "notSignedIn" });
    expect(await port.undo("name")).toEqual({ kind: "notSignedIn" });
    expect(world.sent()).toEqual([]);
  });
});

const HELD_WRITES = {
  costume: {
    start: (port: HirobaSessionPort) => port.changeCostume(CHANGE),
    hold: (world: ReturnType<typeof setUp>, on: 0 | 1) =>
      world.hook("/__hold-precheck", `on=${on}`),
    heldAt: "POST /ajax/check_ip_kisekae.php",
    requests: SIX_REQUESTS,
  },
  title: {
    start: (port: HirobaSessionPort) => port.changeTitle(TITLE_CHANGE),
    hold: (world: ReturnType<typeof setUp>, on: 0 | 1) =>
      world.profileHook("/__title-hold-precheck", `on=${on}`),
    heldAt: "POST /ajax/check_ip_title.php",
    requests: TITLE_SIX_REQUESTS,
  },
  name: {
    start: (port: HirobaSessionPort) => port.changeName(NAME_CHANGE),
    hold: (world: ReturnType<typeof setUp>, on: 0 | 1) =>
      world.profileHook("/__profile-hold-save", `on=${on}`),
    heldAt: "POST /ajax/change_mydon_profile.php",
    requests: NAME_FIVE_REQUESTS,
  },
} as const;

const READS_ASKED: Record<
  VerbsQueued<"read">,
  { ask: (port: HirobaSessionPort) => Promise<unknown>; requests: string[] }
> = {
  readProfile: { ask: (port) => port.readProfile(), requests: ["GET /mypage_top.php"] },
  openCostumeEditor: {
    ask: (port) => port.openCostumeEditor(),
    requests: ["GET /mypage_kisekae.php"],
  },
  openTitleEditor: {
    ask: (port) => port.openTitleEditor(),
    requests: ["GET /mypage_title_edit.php"],
  },
  previewCostume: {
    ask: (port) => port.previewCostume(START_SET),
    requests: ["GET /imgsrc_mydon.php"],
  },
};

describe.each(Object.keys(HELD_WRITES) as (keyof typeof HELD_WRITES)[])(
  "createAndroidPort while a %s write waits mid-way",
  (kind) => {
    beforeEach(() => native.reset());
    const held = HELD_WRITES[kind];

    async function holdWrite(world: ReturnType<typeof setUp>, port: HirobaSessionPort) {
      held.hold(world, 1);
      const writing = held.start(port);
      await until(() => world.sent().includes(held.heldAt));
      return { writing, release: () => held.hold(world, 0) };
    }

    test.each(Object.keys(READS_ASKED) as (keyof typeof READS_ASKED)[])(
      "a %s asked for meanwhile sends nothing until the write has read back, and then goes",
      async (read) => {
        const world = setUp();
        const port = await signedInPort(world);
        const { writing, release } = await holdWrite(world, port);
        const requestsInTheWrite = world.sent().length;

        const reading = READS_ASKED[read].ask(port);
        await Bun.sleep(25);
        expect(world.sent()).toHaveLength(requestsInTheWrite);

        release();
        expect((await writing).kind).toBe("applied");
        await reading;
        expect(world.sent()).toEqual([...held.requests, ...READS_ASKED[read].requests]);
      },
    );

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
