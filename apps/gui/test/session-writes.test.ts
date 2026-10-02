/**
 * The shells' shared write verbs against the mock's own costume editor (scripts/mock-costume.ts), in
 * process, with the undo slots on disk in a temporary folder: the gate, the undo record's life, and
 * the session dropped when Hiroba ends it.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type CostumeSet, ok, type Transport } from "@abth/core";

import { createUndoStore } from "../electron/undo-store";
import { createCostumeEditor, INITIAL_COSTUME, type MockSession } from "../scripts/mock-costume";
import { createSessionWrites, type UndoStore } from "../src/hiroba-session";

const ORIGIN = "https://hiroba.test";
const ENDPOINTS = {
  hirobaOrigin: ORIGIN,
  idpHost: "id.test",
  idpDomain: "id.test",
  imgOrigin: null,
};
const OPEN = { isPackaged: false, env: { ABTH_UNVERIFIED_WRITES: "1" } };
const NOON_JST = () => new Date("2026-09-27T03:00:00Z");
const OWNER = "000000000000";
/** Another card, as one Bandai Namco ID can hold. */
const OTHER = "111111111111";

/** My page, cut down to what the parser needs. */
const MY_PAGE = `<div id="mydon_area"><div>サンプルの称号</div><div><div>サンプルどん</div></div>
<div><div class="detail"><p>国・地域 ：サンプル</p><p>太鼓番：${OWNER}</p></div></div>
<div class="total_score"><img src="image/sp/640/total_score_image_5.png">
${[8, 7, 6, 5, 4, 3, 2].map((rank) => `<div class="best_rank_score_${rank}">1</div>`).join("")}
<div class="silver_crown_count">1</div><div class="gold_crown_count">1</div><div class="donderful_crown_count">1</div></div></div>
<div class="favoriteSong"><h2 class="subtitleMypage">大好きな曲</h2><div class="mypageInfoArea">
<ul id="songList"><li><div class="name"><span class="songName songNameFont">未設定</span></div></li></ul></div></div>
<div class="favoriteSong"><h2 class="subtitleMypage">お気に入りの曲</h2><div class="mypageInfoArea"><ul id="songList"></ul></div></div>`;

/** The mock's field names, as the app's set names them. */
const fromMock = (state: Record<string, number>): CostumeSet => ({
  colorBody: state.color_body ?? -1,
  colorLimb: state.color_limb ?? -1,
  colorFace: state.color_face ?? -1,
  costume1: state.costume_1 ?? -1,
  costume2: state.costume_2 ?? -1,
  costume3: state.costume_3 ?? -1,
  costume4: state.costume_4 ?? -1,
  costume5: state.costume_5 ?? -1,
});
const START = fromMock(INITIAL_COSTUME);

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

/** The mock's editor behind a transport, and the shared writes over both. */
function setUp(
  options: { gate?: typeof OPEN; owner?: string | null; whose?: () => string | null } = {},
) {
  const editor = createCostumeEditor();
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
        return answer(
          request.url,
          html(path === "/mypage_kisekae.php" ? editor.page(session) : MY_PAGE),
        );
      }
      hiroba.saved ||= path === "/ajax/change_mydon.php";
      const form = new URLSearchParams();
      for (const [name, value] of request.form) {
        form.append(name, value);
      }
      return answer(
        request.url,
        path === "/ajax/check_ip_kisekae.php"
          ? editor.precheck()
          : editor.save(session, form, () => {
              hiroba.ended = true;
            }),
      );
    },
  };
  const folder = mkdtempSync(join(tmpdir(), "abth-writes-"));
  folders.push(folder);
  const undoPath = join(folder, "undo.json");
  const faults: StoreFaults = { load: false, savesAllowed: null };
  let signedIn = true;
  const writes = createSessionWrites({
    transport,
    endpoints: ENDPOINTS,
    gate: options.gate ?? OPEN,
    now: NOON_JST,
    undoStore: failing(createUndoStore(undoPath), faults),
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
    fromMock(
      (await editor.hook("/__state", new URLSearchParams())?.json()) as Record<string, number>,
    );
  const setElsewhere = (params: string) => editor.hook("/__state", new URLSearchParams(params));
  const signInAgain = () => {
    hiroba.ended = false;
    signedIn = true;
  };
  return { editor, hiroba, writes, saved, setElsewhere, signInAgain, undoPath, faults };
}

describe("createSessionWrites", () => {
  test("with the gate shut, enables nothing, offers no undo and sends nothing", async () => {
    const { hiroba, writes } = setUp({ gate: { isPackaged: true, env: OPEN.env } });
    expect(await writes.enabledWrites()).toEqual([]);
    expect(
      await writes.changeCostume({ expected: START, target: { ...START, colorFace: 3 } }),
    ).toEqual({ kind: "notEnabled" });
    expect(await writes.undo("costume")).toEqual({ kind: "notEnabled" });
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

  test("a change leaves an undo on disk, and the undo puts the whole set back", async () => {
    const { editor, hiroba, writes, saved, undoPath } = setUp();
    const suited = { ...START, costume1: 36, costume2: 0, costume3: 0, costume4: 0, costume5: 0 };
    expect((await writes.changeCostume({ expected: START, target: suited })).kind).toBe("applied");
    expect(await saved()).toEqual(suited);
    expect(await writes.pendingUndo()).toEqual([
      { kind: "costume", at: NOON_JST().toISOString(), before: START, after: suited },
    ]);
    const tickets = (await editor.hook("/__tickets", new URLSearchParams())?.json()) as string[];
    const onDisk = readFileSync(undoPath, "utf8");
    expect(tickets.some((ticket) => onDisk.includes(ticket))).toBe(false);

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
