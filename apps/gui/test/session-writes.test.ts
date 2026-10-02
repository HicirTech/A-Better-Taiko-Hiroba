/**
 * The shells' shared write verbs against the mock's own costume editor (scripts/mock-costume.ts) and
 * profile (scripts/mock-profile.ts: the title page and its posts), in process, once over each place
 * a shell keeps its undo slots (a file in a temporary folder, as the desktop does, and a stand-in
 * for IndexedDB, as Android does): the cross-check, the undo record's life, and the session dropped
 * when Hiroba ends it.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ok, type Transport } from "@abth/core";

import { createUndoStore } from "../electron/undo-store";
import { createCostumeEditor, type MockSession } from "../scripts/mock-costume";
import {
  createProfileEditor,
  escapeHtml,
  INITIAL_PROFILE,
  OWNED_TITLES,
} from "../scripts/mock-profile";
import { createSessionWrites, type UndoStore, type WritePlatform } from "../src/hiroba-session";
import { createIndexedDbUndoStore } from "../src/platform/android-undo-store";
import type { WriteKind } from "../src/session-port";
import { costumeSetOf, START_SET } from "./hiroba-stand-in";
import { createFakeIndexedDb } from "./indexeddb-fake";

const ORIGIN = "https://hiroba.test";
const ENDPOINTS = {
  hirobaOrigin: ORIGIN,
  idpHost: "id.test",
  idpDomain: "id.test",
  imgOrigin: null,
};
const NOON_JST = () => new Date("2026-09-27T03:00:00Z");
const OWNER = "000000000000";
/** Another card, as one Bandai Namco ID can hold. */
const OTHER = "111111111111";

/** My page, cut down to what the parser needs, wearing `title` and carrying the rename dialog. */
const myPage = (
  title: string,
  dialog: string,
) => `<div id="mydon_area"><div>${escapeHtml(title)}</div><div><div>サンプルどん</div></div>
<div><div class="detail"><p>国・地域 ：サンプル</p><p>太鼓番：${OWNER}</p></div></div>
<div class="total_score"><img src="image/sp/640/total_score_image_5.png">
${[8, 7, 6, 5, 4, 3, 2].map((rank) => `<div class="best_rank_score_${rank}">1</div>`).join("")}
<div class="silver_crown_count">1</div><div class="gold_crown_count">1</div><div class="donderful_crown_count">1</div></div></div>
<div class="favoriteSong"><h2 class="subtitleMypage">大好きな曲</h2><div class="mypageInfoArea">
<ul id="songList"><li><div class="name"><span class="songName songNameFont">未設定</span></div></li></ul></div></div>
<div class="favoriteSong"><h2 class="subtitleMypage">お気に入りの曲</h2><div class="mypageInfoArea"><ul id="songList"></ul></div></div>
${dialog}`;

const START = START_SET;

/** Which calls of the undo store fail from now on, as a database that will not open or write does. */
interface StoreFaults {
  /** Every load rejects. */
  load: boolean;
  /** How many saves go through before every later one rejects; null lets them all through. */
  savesAllowed: number | null;
}

/** The store, with the calls its faults name rejected. */
function failing(store: UndoStore, faults: StoreFaults): UndoStore {
  const refuse = (call: string) => Promise.reject(new Error(`The store refuses ${call}`));
  return {
    load: (kind, taikoNo) => (faults.load ? refuse("load") : store.load(kind, taikoNo)),
    save: (kind, taikoNo, slot) => {
      if (faults.savesAllowed === 0) {
        return refuse("save");
      }
      if (faults.savesAllowed !== null) {
        faults.savesAllowed -= 1;
      }
      return store.save(kind, taikoNo, slot);
    },
  };
}

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

/** An undo store, and a way to read everything it holds as text. */
interface KeptSlots {
  readonly store: UndoStore;
  readonly text: () => string;
}

/** The two places a shell keeps undo slots: a file on the desktop, a database on Android. */
const STORES = {
  file(): KeptSlots {
    const folder = mkdtempSync(join(tmpdir(), "abth-writes-"));
    folders.push(folder);
    const path = join(folder, "undo.json");
    return { store: createUndoStore(path), text: () => readFileSync(path, "utf8") };
  },
  database(): KeptSlots {
    const indexedDb = createFakeIndexedDb();
    return {
      store: createIndexedDbUndoStore(indexedDb.factory),
      text: () => JSON.stringify([...(indexedDb.tables.get("slots") ?? [])]),
    };
  },
};
type StoreName = keyof typeof STORES;
const STORE_NAMES: StoreName[] = ["file", "database"];

interface SetUpOptions {
  /** Whose list of live-checked kinds applies. Android's is empty: it cross-checks. */
  platform?: WritePlatform;
  liveChecked?: readonly WriteKind[];
  signedIn?: boolean;
  owner?: string | null;
  whose?: () => string | null;
}

/** The mock's editor behind a transport, and the shared writes over both. */
function setUpOver(storeName: StoreName, options: SetUpOptions) {
  const editor = createCostumeEditor();
  const profile = createProfileEditor({ issue: editor.issueTicket });
  const session: MockSession = { cardChosen: true };
  const hiroba = {
    ended: false,
    log: [] as string[],
    endedByApp: 0,
    /** The first GET after a save throws, as a transport with a fault in it would. */
    throwAfterSave: false,
    saved: false,
    /** How many times the writes said the costume changed. */
    costumeChanges: 0,
  };
  const answer = async (url: string, response: Response) =>
    ok({
      status: response.status,
      url,
      headers: { "content-type": response.headers.get("content-type") ?? "" },
      body: new Uint8Array(await response.arrayBuffer()),
    });
  const html = (body: string) =>
    new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });
  const transport: Transport = {
    async send(request) {
      const path = new URL(request.url).pathname;
      hiroba.log.push(`${request.method} ${path}`);
      if (hiroba.ended) {
        return answer(`${ORIGIN}/login.php`, html(`<form id="login_form"></form>`));
      }
      if (request.method === "GET") {
        if (hiroba.throwAfterSave && hiroba.saved) {
          hiroba.throwAfterSave = false;
          throw new Error("EBUSY: resource busy or locked");
        }
        // My page and the title page carry forms, so each read of either issues the session a token.
        return answer(
          request.url,
          html(
            path === "/mypage_kisekae.php"
              ? editor.page(session)
              : path === "/mypage_title_edit.php"
                ? profile.titlePage(session)
                : myPage(profile.title(), profile.renameDialog(editor.issueTicket(session))),
          ),
        );
      }
      hiroba.saved ||=
        path === "/ajax/change_mydon.php" || path === "/ajax/change_mydon_profile.php";
      const form = new URLSearchParams();
      for (const [name, value] of request.form) {
        form.append(name, value);
      }
      const endAllSessions = () => {
        hiroba.ended = true;
      };
      return answer(
        request.url,
        path === "/ajax/check_ip_kisekae.php"
          ? editor.precheck()
          : path === "/ajax/check_ip_title.php"
            ? profile.precheck()
            : path === "/ajax/change_mydon_profile.php"
              ? profile.save(session, form, endAllSessions)
              : editor.save(session, form, endAllSessions),
      );
    },
  };
  const kept = STORES[storeName]();
  const faults: StoreFaults = { load: false, savesAllowed: null };
  let signedIn = options.signedIn ?? true;
  const writes = createSessionWrites({
    transport,
    endpoints: ENDPOINTS,
    platform: options.platform ?? "android",
    ...(options.liveChecked && { liveChecked: options.liveChecked }),
    now: NOON_JST,
    undoStore: failing(kept.store, faults),
    signedIn: () => signedIn,
    endSession: () => {
      signedIn = false;
      hiroba.endedByApp += 1;
    },
    owner: options.whose ?? (() => (options.owner === undefined ? OWNER : options.owner)),
    costumeChanged: () => {
      hiroba.costumeChanges += 1;
    },
  });
  const saved = async () =>
    costumeSetOf(
      (await editor.hook("/__state", new URLSearchParams())?.json()) as Record<string, number>,
    );
  const setElsewhere = (params: string) => editor.hook("/__state", new URLSearchParams(params));
  const signInAgain = () => {
    hiroba.ended = false;
    signedIn = true;
  };
  return {
    editor,
    profile,
    hiroba,
    writes,
    saved,
    setElsewhere,
    signInAgain,
    keptText: kept.text,
    faults,
  };
}

describe.each(STORE_NAMES)("createSessionWrites over the %s undo store", (storeName) => {
  const setUp = (options: SetUpOptions = {}) => setUpOver(storeName, options);

  const FOUR = [
    "GET /mypage_kisekae.php",
    "POST /ajax/check_ip_kisekae.php",
    "POST /ajax/change_mydon.php",
    "GET /mypage_kisekae.php",
  ];
  const SIX = ["GET /mypage_top.php", ...FOUR, "GET /mypage_top.php"];
  const target = { ...START, colorFace: 3 };

  test("sends a write with nothing to open it, the desktop's costume in four requests", async () => {
    const { hiroba, writes } = setUp({ platform: "desktop" });
    expect((await writes.changeCostume({ expected: START, target })).kind).toBe("applied");
    expect(hiroba.log).toEqual(FOUR);
  });

  test("reads my page before and after a write that has not been made for real from the platform", async () => {
    const { hiroba, writes } = setUp({ platform: "android" });
    expect((await writes.changeCostume({ expected: START, target })).kind).toBe("applied");
    expect(hiroba.log).toEqual(SIX);
  });

  test("goes by the list it is given, in place of the platform's own", async () => {
    const live = setUp({ platform: "android", liveChecked: ["costume"] });
    await live.writes.changeCostume({ expected: START, target });
    expect(live.hiroba.log).toEqual(FOUR);

    const unchecked = setUp({ platform: "desktop", liveChecked: [] });
    await unchecked.writes.changeCostume({ expected: START, target });
    expect(unchecked.hiroba.log).toEqual(SIX);
  });

  test("asks Hiroba nothing while signed out, and offers no undo", async () => {
    const { hiroba, writes } = setUp({ signedIn: false });
    expect(await writes.changeCostume({ expected: START, target })).toEqual({
      kind: "notSignedIn",
    });
    expect(await writes.undo("costume")).toEqual({ kind: "notSignedIn" });
    expect(await writes.pendingUndo()).toEqual([]);
    expect(hiroba.log).toEqual([]);
  });

  test("posts nothing before my page has said whose set this is", async () => {
    const { hiroba, writes } = setUp({ owner: null });
    const outcome = await writes.changeCostume({
      expected: START,
      target: { ...START, colorFace: 3 },
    });
    expect(outcome).toEqual({ kind: "undoNotSaved" });
    expect(hiroba.log.filter((request) => request.startsWith("POST"))).toEqual([]);
  });

  test("a change leaves an undo kept, and the undo puts the whole set back", async () => {
    const { editor, hiroba, writes, saved, keptText } = setUp();
    const suited = { ...START, costume1: 36, costume2: 0, costume3: 0, costume4: 0, costume5: 0 };
    expect((await writes.changeCostume({ expected: START, target: suited })).kind).toBe("applied");
    expect(await saved()).toEqual(suited);
    expect(await writes.pendingUndo()).toEqual([
      { kind: "costume", at: NOON_JST().toISOString(), before: START, after: suited },
    ]);
    const tickets = (await editor.hook("/__tickets", new URLSearchParams())?.json()) as string[];
    const kept = keptText();
    expect(tickets.some((ticket) => kept.includes(ticket))).toBe(false);

    hiroba.log.length = 0;
    expect((await writes.undo("costume")).kind).toBe("applied");
    expect(await saved()).toEqual(START);
    expect(await writes.pendingUndo()).toEqual([]);
    // An undo is a write like any other: the cross-check, a fresh editor last before the posts, the
    // pre-check, one save.
    expect(hiroba.log).toEqual([
      "GET /mypage_top.php",
      "GET /mypage_kisekae.php",
      "POST /ajax/check_ip_kisekae.php",
      "POST /ajax/change_mydon.php",
      "GET /mypage_kisekae.php",
      "GET /mypage_top.php",
    ]);
  });

  test("says the costume changed after a change or an undo that applied, and after nothing else", async () => {
    const { editor, hiroba, writes, setElsewhere } = setUp();
    const target = { ...START, colorFace: 3 };
    expect((await writes.changeCostume({ expected: START, target })).kind).toBe("applied");
    expect(hiroba.costumeChanges).toBe(1);
    expect((await writes.undo("costume")).kind).toBe("applied");
    expect(hiroba.costumeChanges).toBe(2);
    expect((await writes.changeCostume({ expected: START, target: START })).kind).toBe(
      "nothingToChange",
    );
    editor.hook("/__noop-save", new URLSearchParams());
    expect((await writes.changeCostume({ expected: START, target })).kind).toBe("notApplied");
    setElsewhere("color_body=40");
    expect((await writes.changeCostume({ expected: START, target })).kind).toBe(
      "changedSincePreview",
    );
    expect(hiroba.costumeChanges).toBe(2);
  });

  test("an undo after a change made elsewhere changes nothing, and is no longer offered", async () => {
    const { writes, saved, setElsewhere } = setUp();
    await writes.changeCostume({ expected: START, target: { ...START, colorFace: 3 } });
    setElsewhere("color_body=40");
    const outcome = await writes.undo("costume");
    expect(outcome.kind).toBe("changedSincePreview");
    expect((await saved()).colorBody).toBe(40);
    expect(await writes.pendingUndo()).toEqual([]);
    expect(await writes.undo("costume")).toEqual({ kind: "nothingToUndo" });
  });

  test("a session Hiroba ends after the save is dropped, and the undo settles on the next read", async () => {
    const { editor, hiroba, writes, signInAgain } = setUp();
    editor.hook("/__expire-on-save", new URLSearchParams());
    const target = { ...START, colorFace: 3 };
    const outcome = await writes.changeCostume({ expected: START, target });
    expect(outcome).toMatchObject({ kind: "sessionGone", writeMayHaveHappened: true });
    expect(hiroba.endedByApp).toBe(1);
    expect(await writes.pendingUndo()).toEqual([]);

    signInAgain();
    const opened = await writes.openCostumeEditor();
    expect(opened.ok && opened.value.state).toEqual(target);
    expect(await writes.pendingUndo()).toMatchObject([{ before: START, after: target }]);
  });

  test("keeps each player's undo apart, whatever another card writes in between", async () => {
    let whose = OWNER;
    const { editor, writes, setElsewhere, signInAgain } = setUp({ whose: () => whose });
    // A change of this player's that ends unknown after its save: a pending write, kept.
    editor.hook("/__expire-on-save", new URLSearchParams());
    const mine = { ...START, colorFace: 3 };
    const unknown = await writes.changeCostume({ expected: START, target: mine });
    expect(unknown).toMatchObject({ kind: "sessionGone", writeMayHaveHappened: true });
    signInAgain();

    // Another card on the same ID, wearing its own set: a save that moves nothing, then a change.
    whose = OTHER;
    setElsewhere("reset=1&color_body=40");
    const theirs = { ...START, colorBody: 40 };
    const changed = { ...theirs, colorLimb: 20 };
    expect(await writes.pendingUndo()).toEqual([]);
    editor.hook("/__noop-save", new URLSearchParams());
    expect((await writes.changeCostume({ expected: theirs, target: changed })).kind).toBe(
      "notApplied",
    );
    expect((await writes.changeCostume({ expected: theirs, target: changed })).kind).toBe(
      "applied",
    );
    expect(await writes.pendingUndo()).toMatchObject([{ before: theirs, after: changed }]);

    // Back on the first card, as its save left it: its pending write settles into its own undo.
    whose = OWNER;
    setElsewhere("reset=1&color_face=3");
    expect(await writes.pendingUndo()).toEqual([]);
    await writes.openCostumeEditor();
    expect(await writes.pendingUndo()).toMatchObject([{ before: START, after: mine }]);
    // And the other card's undo is still there for it, current.
    whose = OTHER;
    expect(await writes.pendingUndo()).toMatchObject([{ before: theirs, after: changed }]);
  });

  test("a write that throws after its save ends interrupted, and its pending undo is kept", async () => {
    const { hiroba, writes, saved } = setUp();
    hiroba.throwAfterSave = true;
    const target = { ...START, colorFace: 3 };
    expect(await writes.changeCostume({ expected: START, target })).toEqual({
      kind: "interrupted",
    });
    expect(hiroba.log.filter((request) => request === "POST /ajax/change_mydon.php")).toHaveLength(
      1,
    );
    expect(await saved()).toEqual(target);
    expect(await writes.pendingUndo()).toEqual([]);

    // The next editor read finds the save landed, and settles the pending write into an undo.
    await writes.openCostumeEditor();
    expect(await writes.pendingUndo()).toMatchObject([{ before: START, after: target }]);
  });

  test("sends nothing when the undo cannot be kept, and breaks no read or offer", async () => {
    const { hiroba, writes, faults } = setUp();
    const change = { expected: START, target: { ...START, colorFace: 3 } };
    faults.load = true;
    expect(await writes.changeCostume(change)).toEqual({ kind: "undoNotSaved" });
    faults.load = false;
    faults.savesAllowed = 0;
    expect(await writes.changeCostume(change)).toEqual({ kind: "undoNotSaved" });
    expect(hiroba.log.filter((request) => request.startsWith("POST"))).toEqual([]);

    faults.load = true;
    expect(await writes.pendingUndo()).toEqual([]);
    expect(await writes.undo("costume")).toEqual({ kind: "nothingToUndo" });
    expect((await writes.openCostumeEditor()).ok).toBe(true);
  });

  test("a store that fails after the pending write is kept does not change how the write ended", async () => {
    const { writes, faults, saved } = setUp();
    const target = { ...START, colorFace: 3 };
    faults.savesAllowed = 1;
    expect((await writes.changeCostume({ expected: START, target })).kind).toBe("applied");
    expect(await saved()).toEqual(target);
    // The write is done, though its record could not be settled: the pending write is still kept.
    expect(await writes.pendingUndo()).toEqual([]);

    // The next editor read finds the save landed, and settles the pending write into an undo.
    faults.savesAllowed = null;
    await writes.openCostumeEditor();
    expect(await writes.pendingUndo()).toMatchObject([{ before: START, after: target }]);
  });

  test("reads no editor while signed out", async () => {
    const { hiroba, writes } = setUp();
    hiroba.ended = true;
    expect((await writes.openCostumeEditor()).ok).toBe(false);
    expect(hiroba.endedByApp).toBe(1);
    expect(await writes.openCostumeEditor()).toEqual({ ok: false, error: { kind: "notSignedIn" } });
  });
});

const START_TITLE = INITIAL_PROFILE.title;
const owned = (id: number) => {
  const found = OWNED_TITLES.find((one) => one.id === id);
  if (found === undefined) {
    throw new Error(`The mock owns no title ${id}`);
  }
  return found;
};
/** A title write from `from`, the title worn, to the owned title `id`, picked from the list. */
const titleChange = (from: string, id: number) => ({
  expected: { title: from },
  target: { id, title: owned(id).label },
});

describe.each(STORE_NAMES)("createSessionWrites over the %s undo store, the title", (storeName) => {
  const setUp = (options: SetUpOptions = {}) => setUpOver(storeName, options);

  const FOUR = [
    "GET /mypage_title_edit.php",
    "POST /ajax/check_ip_title.php",
    "POST /ajax/change_mydon_profile.php",
    "GET /mypage_top.php",
  ];
  const SIX = ["GET /mypage_kisekae.php", ...FOUR, "GET /mypage_kisekae.php"];

  test("reads the costume before and after a title write on either platform: title is on neither's list", async () => {
    for (const platform of ["android", "desktop"] as const) {
      const { hiroba, writes } = setUp({ platform });
      expect((await writes.changeTitle(titleChange(START_TITLE, 102))).kind).toBe("applied");
      expect(hiroba.log).toEqual(SIX);
    }
  });

  test("sends the four requests alone once the kind is on the platform's list", async () => {
    const { hiroba, writes } = setUp({ liveChecked: ["costume", "title"] });
    expect((await writes.changeTitle(titleChange(START_TITLE, 102))).kind).toBe("applied");
    expect(hiroba.log).toEqual(FOUR);
  });

  test("a change leaves an undo kept, and the undo puts the title back by its name in one save", async () => {
    const { editor, profile, hiroba, writes, keptText } = setUp();
    expect((await writes.changeTitle(titleChange(START_TITLE, 102))).kind).toBe("applied");
    expect(profile.title()).toBe(owned(102).label);
    expect(await writes.pendingUndo()).toEqual([
      {
        kind: "title",
        at: NOON_JST().toISOString(),
        before: { title: START_TITLE },
        after: { title: owned(102).label },
      },
    ]);
    const tickets = (await editor.hook("/__tickets", new URLSearchParams())?.json()) as string[];
    const kept = keptText();
    expect(tickets.some((ticket) => kept.includes(ticket))).toBe(false);

    hiroba.log.length = 0;
    expect((await writes.undo("title")).kind).toBe("applied");
    expect(profile.title()).toBe(START_TITLE);
    expect(await writes.pendingUndo()).toEqual([]);
    expect(hiroba.log).toEqual(SIX);
    const saves = hiroba.log.filter((request) => request === "POST /ajax/change_mydon_profile.php");
    expect(saves).toHaveLength(1);
  });

  test("keeps the costume's undo and the title's apart, one of each at most", async () => {
    const { writes } = setUp();
    await writes.changeCostume({ expected: START, target: { ...START, colorFace: 3 } });
    await writes.changeTitle(titleChange(START_TITLE, 102));
    expect((await writes.pendingUndo()).map((one) => one.kind)).toEqual(["costume", "title"]);

    expect((await writes.undo("title")).kind).toBe("applied");
    expect((await writes.pendingUndo()).map((one) => one.kind)).toEqual(["costume"]);
    expect((await writes.undo("costume")).kind).toBe("applied");
    expect(await writes.pendingUndo()).toEqual([]);
  });

  test("says the costume changed after a costume write alone: a title write, or its undo, never does", async () => {
    const { hiroba, writes } = setUp();
    await writes.changeTitle(titleChange(START_TITLE, 102));
    await writes.undo("title");
    expect(hiroba.costumeChanges).toBe(0);
    await writes.changeCostume({ expected: START, target: { ...START, colorFace: 3 } });
    expect(hiroba.costumeChanges).toBe(1);
  });

  type UnresolvedCase = [label: string, previous: string, field: string];
  test.each<UnresolvedCase>([
    ["a name two titles share", owned(105).label, "title.ambiguous"],
    ["a title in no list, as one composed of parts is", "組み合わせの称号", "title.unresolved"],
    ["no title", "", "title.unresolved"],
  ])("an undo to %s is refused unsent, and stays offered", async (_label, previous, field) => {
    const { profile, hiroba, writes } = setUp();
    profile.setTitle(previous);
    expect((await writes.changeTitle(titleChange(previous, 101))).kind).toBe("applied");

    hiroba.log.length = 0;
    expect(await writes.undo("title")).toEqual({ kind: "invalidTarget", field });
    expect(hiroba.log.filter((request) => request.startsWith("POST"))).toEqual([]);
    expect(profile.title()).toBe(owned(101).label);
    expect(await writes.pendingUndo()).toMatchObject([
      { kind: "title", before: { title: previous }, after: { title: owned(101).label } },
    ]);
  });

  test("an undo after a title changed elsewhere sends nothing, and is no longer offered", async () => {
    const { profile, writes } = setUp();
    await writes.changeTitle(titleChange(START_TITLE, 102));
    profile.setTitle(owned(103).label);
    expect((await writes.undo("title")).kind).toBe("changedSincePreview");
    expect(profile.title()).toBe(owned(103).label);
    expect(await writes.pendingUndo()).toEqual([]);
    expect(await writes.undo("title")).toEqual({ kind: "nothingToUndo" });
  });

  test("a read of my page settles a title write whose end was not known, from the title it shows", async () => {
    const { profile, writes, signInAgain } = setUp();
    profile.hook("/__profile-expire-on-save", new URLSearchParams());
    const outcome = await writes.changeTitle(titleChange(START_TITLE, 102));
    expect(outcome).toMatchObject({ kind: "sessionGone", writeMayHaveHappened: true });
    signInAgain();
    expect(await writes.pendingUndo()).toEqual([]);

    await writes.profileRead({ taikoNo: OWNER, title: owned(102).label });
    expect(await writes.pendingUndo()).toMatchObject([
      { kind: "title", before: { title: START_TITLE }, after: { title: owned(102).label } },
    ]);
  });

  test("the title page settles it too, as the costume editor settles the costume's", async () => {
    const { profile, writes, signInAgain } = setUp();
    profile.hook("/__profile-expire-on-save", new URLSearchParams());
    await writes.changeTitle(titleChange(START_TITLE, 102));
    signInAgain();
    const opened = await writes.openTitleEditor();
    expect(opened.ok && opened.value.state).toEqual({ title: owned(102).label });
    expect(opened.ok && opened.value.options).toEqual(OWNED_TITLES);
    expect(await writes.pendingUndo()).toMatchObject([
      { kind: "title", after: { title: owned(102).label } },
    ]);
  });

  test("a read of my page dates a title record the title has moved away from", async () => {
    const { writes } = setUp();
    await writes.changeTitle(titleChange(START_TITLE, 102));
    await writes.profileRead({ taikoNo: OWNER, title: "別の場所で変えた称号" });
    expect(await writes.pendingUndo()).toEqual([]);
    expect(await writes.undo("title")).toEqual({ kind: "nothingToUndo" });
  });

  test("a read of my page that finds nothing kept writes nothing, and leaves a current record as it is", async () => {
    const { writes, keptText } = setUp();
    const touched = () => {
      try {
        return keptText() !== "[]";
      } catch {
        return false;
      }
    };
    await writes.profileRead({ taikoNo: OWNER, title: START_TITLE });
    expect(touched()).toBe(false);

    await writes.changeTitle(titleChange(START_TITLE, 102));
    await writes.profileRead({ taikoNo: OWNER, title: owned(102).label });
    expect(await writes.pendingUndo()).toMatchObject([{ kind: "title" }]);
  });

  test("a read of my page that cannot look in the store reads on", async () => {
    const { writes, faults } = setUp();
    faults.load = true;
    await expect(
      writes.profileRead({ taikoNo: OWNER, title: START_TITLE }),
    ).resolves.toBeUndefined();
  });

  test("keeps each player's title undo apart, whatever another card does in between", async () => {
    let whose = OWNER;
    const { writes } = setUp({ whose: () => whose });
    await writes.changeTitle(titleChange(START_TITLE, 102));

    whose = OTHER;
    expect(await writes.pendingUndo()).toEqual([]);
    expect(await writes.undo("title")).toEqual({ kind: "nothingToUndo" });
    await writes.profileRead({ taikoNo: OTHER, title: "別のカードの称号" });

    whose = OWNER;
    expect(await writes.pendingUndo()).toMatchObject([
      { kind: "title", before: { title: START_TITLE } },
    ]);
  });

  test("a title write that throws after its save ends interrupted, and the next read of the page settles it", async () => {
    const { profile, hiroba, writes } = setUp();
    hiroba.throwAfterSave = true;
    expect(await writes.changeTitle(titleChange(START_TITLE, 102))).toEqual({
      kind: "interrupted",
    });
    expect(profile.title()).toBe(owned(102).label);
    expect(await writes.pendingUndo()).toEqual([]);

    await writes.openTitleEditor();
    expect(await writes.pendingUndo()).toMatchObject([
      { kind: "title", before: { title: START_TITLE }, after: { title: owned(102).label } },
    ]);
  });

  test("sends nothing when the undo cannot be kept, or nobody is known to keep it for", async () => {
    const { hiroba, writes, faults } = setUp();
    faults.load = true;
    expect(await writes.changeTitle(titleChange(START_TITLE, 102))).toEqual({
      kind: "undoNotSaved",
    });
    faults.load = false;
    faults.savesAllowed = 0;
    expect(await writes.changeTitle(titleChange(START_TITLE, 102))).toEqual({
      kind: "undoNotSaved",
    });
    expect(hiroba.log.filter((request) => request.startsWith("POST"))).toEqual([]);

    const nobody = setUp({ owner: null });
    expect(await nobody.writes.changeTitle(titleChange(START_TITLE, 102))).toEqual({
      kind: "undoNotSaved",
    });
    expect(nobody.hiroba.log.filter((request) => request.startsWith("POST"))).toEqual([]);
  });

  test("reads and writes nothing while signed out", async () => {
    const { hiroba, writes } = setUp({ signedIn: false });
    expect(await writes.openTitleEditor()).toEqual({ ok: false, error: { kind: "notSignedIn" } });
    expect(await writes.changeTitle(titleChange(START_TITLE, 102))).toEqual({
      kind: "notSignedIn",
    });
    expect(await writes.undo("title")).toEqual({ kind: "notSignedIn" });
    expect(hiroba.log).toEqual([]);
  });

  test("a title page that finds the session over drops the session", async () => {
    const { hiroba, writes } = setUp();
    hiroba.ended = true;
    expect((await writes.openTitleEditor()).ok).toBe(false);
    expect(hiroba.endedByApp).toBe(1);
  });

  test("a session Hiroba ends before the title is saved is dropped, with nothing left pending", async () => {
    const { hiroba, writes } = setUp();
    hiroba.ended = true;
    expect(await writes.changeTitle(titleChange(START_TITLE, 102))).toMatchObject({
      kind: "sessionGone",
      writeMayHaveHappened: false,
    });
    expect(hiroba.endedByApp).toBe(1);
    expect(await writes.pendingUndo()).toEqual([]);
  });
});
