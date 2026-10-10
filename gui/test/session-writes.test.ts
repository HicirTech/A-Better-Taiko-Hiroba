import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ok, type Transport } from "@abth/core";

import { createCostumeHistoryStore } from "../electron/costume-history-store";
import { createCostumeEditor, type MockSession } from "../scripts/mock-costume";
import {
  createProfileEditor,
  escapeHtml,
  FILTER_MESSAGE,
  INITIAL_PROFILE,
  OWNED_TITLES,
  REFUSED_NAME,
} from "../scripts/mock-profile";
import {
  type CostumeHistoryStore,
  createSessionWrites,
  type WritePlatform,
} from "../src/hiroba-session";
import { MAX_COSTUME_HISTORY } from "../src/hiroba-session/costume-history";
import { createIndexedDbHistoryStore } from "../src/platform/android-history-store";
import type { CostumeSet, WriteKind } from "../src/session-port";
import { costumeSetOf, START_SET } from "./hiroba-stand-in";
import { pictureOfSet } from "./history-fixtures";
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
const OTHER = "111111111111";

/** My page, cut down to what the parser needs, wearing `title` and carrying the rename dialog. */
const myPage = (
  title: string,
  nickname: string,
  dialog: string,
) => `<div id="mydon_area"><div>${escapeHtml(title)}</div><div><div>${escapeHtml(nickname)}</div></div>
<div><div class="detail"><p>国・地域 ：サンプル</p><p>太鼓番：${OWNER}</p></div></div>
<div class="total_score"><img src="image/sp/640/total_score_image_5.png">
${[8, 7, 6, 5, 4, 3, 2].map((rank) => `<div class="best_rank_score_${rank}">1</div>`).join("")}
<div class="silver_crown_count">1</div><div class="gold_crown_count">1</div><div class="donderful_crown_count">1</div></div></div>
<div class="favoriteSong"><h2 class="subtitleMypage">大好きな曲</h2><div class="mypageInfoArea">
<ul id="songList"><li><div class="name"><span class="songName songNameFont">未設定</span></div></li></ul></div></div>
<div class="favoriteSong"><h2 class="subtitleMypage">お気に入りの曲</h2><div class="mypageInfoArea"><ul id="songList"></ul></div></div>
${dialog}`;

const START = START_SET;

interface HistoryFaults {
  load: boolean;
  save: boolean;
}

function failingHistory(store: CostumeHistoryStore, faults: HistoryFaults): CostumeHistoryStore {
  const refuse = (call: string) => Promise.reject(new Error(`The history refuses ${call}`));
  return {
    load: (taikoNo) => (faults.load ? refuse("load") : store.load(taikoNo)),
    save: (taikoNo, entries) => (faults.save ? refuse("save") : store.save(taikoNo, entries)),
  };
}

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

const STORES = {
  file(): CostumeHistoryStore {
    const folder = mkdtempSync(join(tmpdir(), "abth-writes-"));
    folders.push(folder);
    return createCostumeHistoryStore(join(folder, "costume-history.json"));
  },
  database(): CostumeHistoryStore {
    return createIndexedDbHistoryStore(createFakeIndexedDb().factory);
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
  /** The picture this session fetched lately of a set; none by default. */
  recentPreview?: (set: CostumeSet) => string | null;
}

type Writes = ReturnType<typeof createSessionWrites>;

/** The writes as their pipeline runs them: each queued verb sends through `transport`. */
function bound(writes: Writes, transport: Transport) {
  return {
    ...writes,
    openCostumeEditor: () => writes.openCostumeEditor(transport),
    openTitleEditor: () => writes.openTitleEditor(transport),
    changeCostume: (change: Parameters<Writes["changeCostume"]>[1]) =>
      writes.changeCostume(transport, change),
    changeTitle: (change: Parameters<Writes["changeTitle"]>[1]) =>
      writes.changeTitle(transport, change),
    changeName: (change: Parameters<Writes["changeName"]>[1]) =>
      writes.changeName(transport, change),
  };
}

function setUpOver(storeName: StoreName, options: SetUpOptions) {
  const editor = createCostumeEditor();
  const profile = createProfileEditor({ issue: editor.issueTicket });
  const session: MockSession = { cardChosen: true };
  const hiroba = {
    ended: false,
    log: [] as string[],
    endedByApp: 0,
    throwAfterSave: false,
    saved: false,
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
        // My page and the title page carry forms, so each read of either issues a token.
        return answer(
          request.url,
          html(
            path === "/mypage_kisekae.php"
              ? editor.page(session)
              : path === "/mypage_title_edit.php"
                ? profile.titlePage(session)
                : myPage(
                    profile.title(),
                    profile.nickname(),
                    profile.renameScript() + profile.renameDialog(editor.issueTicket(session)),
                  ),
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
  const historyFaults: HistoryFaults = { load: false, save: false };
  let signedIn = options.signedIn ?? true;
  const writes = createSessionWrites({
    endpoints: ENDPOINTS,
    platform: options.platform ?? "android",
    ...(options.liveChecked && { liveChecked: options.liveChecked }),
    now: NOON_JST,
    historyStore: failingHistory(STORES[storeName](), historyFaults),
    recentPreview: options.recentPreview ?? (() => null),
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
    writes: bound(writes, transport),
    saved,
    setElsewhere,
    signInAgain,
    historyFaults,
  };
}

describe("createSessionWrites, the costume", () => {
  const setUp = (options: SetUpOptions = {}) => setUpOver("database", options);

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

  test("asks Hiroba nothing while signed out", async () => {
    const { hiroba, writes } = setUp({ signedIn: false });
    expect(await writes.changeCostume({ expected: START, target })).toEqual({
      kind: "notSignedIn",
    });
    expect(hiroba.log).toEqual([]);
  });

  test("says the costume changed after a change that applied, and after nothing else", async () => {
    const { editor, hiroba, writes, setElsewhere } = setUp();
    expect((await writes.changeCostume({ expected: START, target })).kind).toBe("applied");
    expect(hiroba.costumeChanges).toBe(1);

    setElsewhere("reset=1");
    expect((await writes.changeCostume({ expected: START, target: START })).kind).toBe(
      "nothingToChange",
    );
    editor.hook("/__noop-save", new URLSearchParams());
    expect((await writes.changeCostume({ expected: START, target })).kind).toBe("notApplied");
    setElsewhere("color_body=40");
    expect((await writes.changeCostume({ expected: START, target })).kind).toBe(
      "changedSincePreview",
    );
    expect(hiroba.costumeChanges).toBe(1);
  });

  test("a session Hiroba ends after the save is dropped, and the editor shows the set once signed in again", async () => {
    const { editor, hiroba, writes, signInAgain } = setUp();
    editor.hook("/__expire-on-save", new URLSearchParams());
    const outcome = await writes.changeCostume({ expected: START, target });
    expect(outcome).toMatchObject({ kind: "sessionGone", writeMayHaveHappened: true });
    expect(hiroba.endedByApp).toBe(1);

    signInAgain();
    const opened = await writes.openCostumeEditor();
    expect(opened.ok && opened.value.state).toEqual(target);
  });

  test("a write that throws after its save ends interrupted", async () => {
    const { hiroba, writes, saved } = setUp();
    hiroba.throwAfterSave = true;
    expect(await writes.changeCostume({ expected: START, target })).toEqual({
      kind: "interrupted",
    });
    expect(hiroba.log.filter((request) => request === "POST /ajax/change_mydon.php")).toHaveLength(
      1,
    );
    expect(await saved()).toEqual(target);
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
const titleChange = (from: string, id: number) => ({
  expected: { title: from },
  target: { id, title: owned(id).label },
});

describe("createSessionWrites, the title", () => {
  const setUp = (options: SetUpOptions = {}) => setUpOver("database", options);

  const FOUR = [
    "GET /mypage_title_edit.php",
    "POST /ajax/check_ip_title.php",
    "POST /ajax/change_mydon_profile.php",
    "GET /mypage_top.php",
  ];
  const SIX = ["GET /mypage_kisekae.php", ...FOUR, "GET /mypage_kisekae.php"];

  test("reads the costume before and after a title write on either platform: title is on neither's list", async () => {
    for (const platform of ["android", "desktop"] as const) {
      const { profile, hiroba, writes } = setUp({ platform });
      expect((await writes.changeTitle(titleChange(START_TITLE, 102))).kind).toBe("applied");
      expect(hiroba.log).toEqual(SIX);
      expect(profile.title()).toBe(owned(102).label);
    }
  });

  test("sends the four requests alone once the kind is on the platform's list", async () => {
    const { hiroba, writes } = setUp({ liveChecked: ["costume", "title"] });
    expect((await writes.changeTitle(titleChange(START_TITLE, 102))).kind).toBe("applied");
    expect(hiroba.log).toEqual(FOUR);
  });

  test("says the costume changed after a costume write alone: a title write never does", async () => {
    const { hiroba, writes } = setUp();
    await writes.changeTitle(titleChange(START_TITLE, 102));
    expect(hiroba.costumeChanges).toBe(0);
    await writes.changeCostume({ expected: START, target: { ...START, colorFace: 3 } });
    expect(hiroba.costumeChanges).toBe(1);
  });

  test("the title page shows the title that a write whose end was unknown left", async () => {
    const { profile, writes, signInAgain } = setUp();
    profile.hook("/__profile-expire-on-save", new URLSearchParams());
    await writes.changeTitle(titleChange(START_TITLE, 102));
    signInAgain();
    const opened = await writes.openTitleEditor();
    expect(opened.ok && opened.value.state).toEqual({ title: owned(102).label });
    expect(opened.ok && opened.value.options).toEqual(OWNED_TITLES);
  });

  test("a title write that throws after its save ends interrupted", async () => {
    const { profile, hiroba, writes } = setUp();
    hiroba.throwAfterSave = true;
    expect(await writes.changeTitle(titleChange(START_TITLE, 102))).toEqual({
      kind: "interrupted",
    });
    expect(profile.title()).toBe(owned(102).label);
  });

  test("reads and writes nothing while signed out", async () => {
    const { hiroba, writes } = setUp({ signedIn: false });
    expect(await writes.openTitleEditor()).toEqual({ ok: false, error: { kind: "notSignedIn" } });
    expect(await writes.changeTitle(titleChange(START_TITLE, 102))).toEqual({
      kind: "notSignedIn",
    });
    expect(hiroba.log).toEqual([]);
  });

  test("a title page that finds the session over drops the session", async () => {
    const { hiroba, writes } = setUp();
    hiroba.ended = true;
    expect((await writes.openTitleEditor()).ok).toBe(false);
    expect(hiroba.endedByApp).toBe(1);
  });

  test("a session Hiroba ends before the title is saved is dropped", async () => {
    const { hiroba, writes } = setUp();
    hiroba.ended = true;
    expect(await writes.changeTitle(titleChange(START_TITLE, 102))).toMatchObject({
      kind: "sessionGone",
      writeMayHaveHappened: false,
    });
    expect(hiroba.endedByApp).toBe(1);
  });
});

const START_NAME = INITIAL_PROFILE.nickname;
const NEW_NAME = "あたらしい";
const renameTo = (name: string, from = START_NAME) => ({
  expected: { nickname: from },
  target: { nickname: name },
});

describe("createSessionWrites, the name", () => {
  const setUp = (options: SetUpOptions = {}) => setUpOver("database", options);

  // No pre-check: my page for the editor, one save, my page to read back.
  const RENAME_REQUESTS = [
    "GET /mypage_top.php",
    "POST /ajax/change_mydon_profile.php",
    "GET /mypage_top.php",
  ];
  const RENAME_WITH_TITLE_READS = [
    "GET /mypage_top.php",
    ...RENAME_REQUESTS,
    "GET /mypage_top.php",
  ];

  test("reads my page for the title before and after a rename on either platform: name is on neither's list", async () => {
    for (const platform of ["android", "desktop"] as const) {
      const { profile, hiroba, writes } = setUp({ platform });
      expect((await writes.changeName(renameTo(NEW_NAME))).kind).toBe("applied");
      expect(hiroba.log).toEqual(RENAME_WITH_TITLE_READS);
      expect(profile.nickname()).toBe(NEW_NAME);
    }
  });

  test("sends the three requests alone once the kind is on the platform's list, and never a pre-check", async () => {
    const { hiroba, writes } = setUp({ liveChecked: ["costume", "name"] });
    expect((await writes.changeName(renameTo(NEW_NAME))).kind).toBe("applied");
    expect(hiroba.log).toEqual(RENAME_REQUESTS);
  });

  test("says the costume changed after a costume write alone: a rename never does", async () => {
    const { hiroba, writes } = setUp();
    await writes.changeName(renameTo(NEW_NAME));
    expect(hiroba.costumeChanges).toBe(0);
  });

  test("shows a name the filter refuses with Hiroba's words", async () => {
    const { profile, writes } = setUp();
    const outcome = await writes.changeName(renameTo(REFUSED_NAME));
    expect(outcome).toMatchObject({
      kind: "notApplied",
      reason: { kind: "refused", code: 1, message: FILTER_MESSAGE },
    });
    expect(profile.nickname()).toBe(START_NAME);
  });

  type RefusedCase = [label: string, name: string, field: string];
  test.each<RefusedCase>([
    ["no name", "", "name.empty"],
    ["a name that starts with a space", " あたらしい", "name.edge"],
    ["a name past the form's ten", "あ".repeat(11), "name.tooLong"],
    ["a name with a control character", "あたら\u{0}しい", "name.control"],
  ])("refuses %s unsent", async (_label, name, field) => {
    const { hiroba, writes } = setUp({ liveChecked: ["costume", "name"] });
    expect(await writes.changeName(renameTo(name))).toEqual({ kind: "invalidTarget", field });
    expect(hiroba.log).toEqual(["GET /mypage_top.php"]);
  });

  test("refuses every name unsent while the page says renames are closed, though it reads the page", async () => {
    const { profile, hiroba, writes } = setUp();
    profile.hook("/__rename", new URLSearchParams("state=closed"));
    expect(await writes.changeName(renameTo(NEW_NAME))).toEqual({
      kind: "invalidTarget",
      field: "name.closed",
    });
    expect(hiroba.log).toEqual(["GET /mypage_top.php", "GET /mypage_top.php"]);
  });

  test("sends nothing for the name that is there already", async () => {
    const { hiroba, writes } = setUp({ liveChecked: ["costume", "name"] });
    expect(await writes.changeName(renameTo(START_NAME))).toEqual({ kind: "nothingToChange" });
    expect(hiroba.log).toEqual(["GET /mypage_top.php"]);
  });

  test("a rename after the name changed elsewhere sends nothing, and reports the name now", async () => {
    const { profile, hiroba, writes } = setUp({ liveChecked: ["costume", "name"] });
    profile.hook("/__profile", new URLSearchParams("nickname=べつのなまえ"));
    expect(await writes.changeName(renameTo(NEW_NAME))).toEqual({
      kind: "changedSincePreview",
      current: { nickname: "べつのなまえ" },
    });
    expect(hiroba.log).toEqual(["GET /mypage_top.php"]);
  });

  test("a rename that throws after its save ends interrupted", async () => {
    const { profile, hiroba, writes } = setUp();
    hiroba.throwAfterSave = true;
    expect(await writes.changeName(renameTo(NEW_NAME))).toEqual({ kind: "interrupted" });
    expect(profile.nickname()).toBe(NEW_NAME);
  });

  test("reads and writes nothing while signed out", async () => {
    const { hiroba, writes } = setUp({ signedIn: false });
    expect(await writes.changeName(renameTo(NEW_NAME))).toEqual({ kind: "notSignedIn" });
    expect(hiroba.log).toEqual([]);
  });

  test("a session Hiroba ends before the rename is saved is dropped", async () => {
    const { hiroba, writes } = setUp();
    hiroba.ended = true;
    expect(await writes.changeName(renameTo(NEW_NAME))).toMatchObject({
      kind: "sessionGone",
      writeMayHaveHappened: false,
    });
    expect(hiroba.endedByApp).toBe(1);
  });
});

describe.each(STORE_NAMES)("createSessionWrites over the %s history store", (storeName) => {
  const setUp = (options: SetUpOptions = {}) =>
    setUpOver(storeName, { recentPreview: pictureOfSet, ...options });
  type World = ReturnType<typeof setUp>;
  const face = (id: number): CostumeSet => ({ ...START, colorFace: id });
  const entry = (set: CostumeSet, picture: string | null = pictureOfSet(set)) => ({ set, picture });
  const CHANGE = { expected: START, target: face(3) };

  test("lists the set a change moved to first and the set it left second, each with its picture", async () => {
    const { writes } = setUp();

    expect((await writes.changeCostume(CHANGE)).kind).toBe("applied");

    expect(await writes.costumeHistory()).toEqual([entry(face(3)), entry(START)]);
  });

  test("keeps no picture for a set this session fetched none of, and keeps one an entry had", async () => {
    let known: Record<number, string> = { 3: pictureOfSet(face(3)) };
    const { writes } = setUp({ recentPreview: ({ colorFace }) => known[colorFace] ?? null });

    await writes.changeCostume({ expected: START, target: face(3) });
    expect(await writes.costumeHistory()).toEqual([entry(face(3)), entry(START, null)]);

    known = {};
    await writes.changeCostume({ expected: face(3), target: face(4) });
    expect(await writes.costumeHistory()).toEqual([
      entry(face(4), null),
      entry(face(3)),
      entry(START, null),
    ]);

    known = { 5: pictureOfSet(START) };
    await writes.changeCostume({ expected: face(4), target: START });
    expect(await writes.costumeHistory()).toEqual([
      entry(START),
      entry(face(4), null),
      entry(face(3)),
    ]);
  });

  test("fills an entry that has no picture once a preview of its set comes, and no other", async () => {
    const { writes } = setUp({ recentPreview: () => null });
    await writes.changeCostume(CHANGE);

    await writes.previewKept(START, pictureOfSet(START));
    await writes.previewKept(face(9), pictureOfSet(face(9)));

    expect(await writes.costumeHistory()).toEqual([entry(face(3), null), entry(START)]);
  });

  test("moves a set worn again to the top, and lists it once", async () => {
    const { writes } = setUp();

    await writes.changeCostume(CHANGE);
    await writes.changeCostume({ expected: face(3), target: START });

    expect(await writes.costumeHistory()).toEqual([entry(START), entry(face(3))]);
  });

  test("keeps at most thirty sets, and the oldest goes", async () => {
    const { writes } = setUp();
    const newest = 5 + MAX_COSTUME_HISTORY + 1;
    let worn = START;

    for (let id = 6; id <= newest; id++) {
      const target = face(id);
      expect((await writes.changeCostume({ expected: worn, target })).kind).toBe("applied");
      worn = target;
    }

    const history = await writes.costumeHistory();
    expect(history).toHaveLength(MAX_COSTUME_HISTORY);
    expect(history[0]?.set).toEqual(face(newest));
    expect(history.at(-1)?.set).toEqual(face(newest - MAX_COSTUME_HISTORY + 1));
  });

  type UnchangedCase = [
    label: string,
    kind: string,
    run: (world: World) => Promise<{ kind: string }>,
  ];
  test.each<UnchangedCase>([
    [
      "a save that moved nothing",
      "notApplied",
      ({ editor, writes }) => {
        editor.hook("/__noop-save", new URLSearchParams());
        return writes.changeCostume(CHANGE);
      },
    ],
    [
      "a set that moved elsewhere",
      "changedSincePreview",
      ({ setElsewhere, writes }) => {
        setElsewhere("color_body=40");
        return writes.changeCostume(CHANGE);
      },
    ],
    [
      "the set worn already",
      "nothingToChange",
      ({ writes }) => writes.changeCostume({ expected: START, target: START }),
    ],
    [
      "a Mascot with pieces beside it",
      "invalidTarget",
      ({ writes }) => writes.changeCostume({ expected: START, target: { ...START, costume1: 36 } }),
    ],
    [
      "a pre-check that stops the write",
      "stoppedBeforeWrite",
      ({ editor, writes }) => {
        editor.hook("/__precheck", new URLSearchParams("answer=0"));
        return writes.changeCostume(CHANGE);
      },
    ],
    [
      "a pre-check that asks for a confirmation",
      "needsConfirmation",
      ({ editor, writes }) => {
        editor.hook("/__precheck", new URLSearchParams("answer=true"));
        return writes.changeCostume(CHANGE);
      },
    ],
    [
      "a session that ends after the save",
      "sessionGone",
      ({ editor, writes }) => {
        editor.hook("/__expire-on-save", new URLSearchParams());
        return writes.changeCostume(CHANGE);
      },
    ],
    [
      "a fault after the save",
      "interrupted",
      ({ hiroba, writes }) => {
        hiroba.throwAfterSave = true;
        return writes.changeCostume(CHANGE);
      },
    ],
  ])("records nothing for %s", async (_label, kind, run) => {
    const world = setUp();

    expect((await run(world)).kind).toBe(kind);

    world.signInAgain();
    expect(await world.writes.costumeHistory()).toEqual([]);
  });

  test("sends a write before my page has said whose set this is, and records nothing for it", async () => {
    let whose: string | null = null;
    const { writes } = setUp({ whose: () => whose });

    expect((await writes.changeCostume(CHANGE)).kind).toBe("applied");

    whose = OWNER;
    expect(await writes.costumeHistory()).toEqual([]);
  });

  test("keeps each player's history apart, whatever another card writes in between", async () => {
    let whose: string | null = OWNER;
    const { writes, setElsewhere } = setUp({ whose: () => whose });
    await writes.changeCostume(CHANGE);

    whose = OTHER;
    expect(await writes.costumeHistory()).toEqual([]);
    setElsewhere("reset=1&color_body=40");
    const theirs = { ...START, colorBody: 40 };
    const changed = { ...theirs, colorLimb: 20 };
    await writes.changeCostume({ expected: theirs, target: changed });
    expect(await writes.costumeHistory()).toEqual([entry(changed), entry(theirs)]);

    whose = OWNER;
    expect(await writes.costumeHistory()).toEqual([entry(face(3)), entry(START)]);
  });

  test("gives nothing while signed out, before my page has said whose it is, or when it cannot be read", async () => {
    let whose: string | null = OWNER;
    const { hiroba, writes, historyFaults, signInAgain } = setUp({ whose: () => whose });
    await writes.changeCostume(CHANGE);

    hiroba.ended = true;
    expect((await writes.changeCostume({ expected: face(3), target: START })).kind).toBe(
      "sessionGone",
    );
    expect(await writes.costumeHistory()).toEqual([]);

    signInAgain();
    whose = null;
    expect(await writes.costumeHistory()).toEqual([]);

    whose = OWNER;
    historyFaults.load = true;
    expect(await writes.costumeHistory()).toEqual([]);

    historyFaults.load = false;
    expect(await writes.costumeHistory()).toHaveLength(2);
  });

  test("asks Hiroba nothing", async () => {
    const { hiroba, writes } = setUp();
    await writes.changeCostume(CHANGE);
    hiroba.log.length = 0;

    await writes.costumeHistory();

    expect(hiroba.log).toEqual([]);
  });

  test("a history that cannot be read or saved changes nothing of the write, and stays as it was", async () => {
    const { hiroba, writes, historyFaults, saved } = setUp();

    historyFaults.load = true;
    expect((await writes.changeCostume(CHANGE)).kind).toBe("applied");
    expect(await saved()).toEqual(face(3));
    historyFaults.load = false;
    expect(await writes.costumeHistory()).toEqual([]);

    historyFaults.save = true;
    expect((await writes.changeCostume({ expected: face(3), target: face(4) })).kind).toBe(
      "applied",
    );
    expect(await saved()).toEqual(face(4));
    historyFaults.save = false;
    expect(await writes.costumeHistory()).toEqual([]);

    await writes.changeCostume({ expected: face(4), target: face(6) });
    expect(await writes.costumeHistory()).toEqual([entry(face(6)), entry(face(4))]);
    expect(hiroba.log.filter((request) => request === "POST /ajax/change_mydon.php")).toHaveLength(
      3,
    );
  });
});
