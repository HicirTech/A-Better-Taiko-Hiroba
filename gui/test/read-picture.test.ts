import { describe, expect, test } from "bun:test";
import { err, ok, type Transport, type TransportRequest } from "@abth/core";
import { encode } from "fast-png";

import { NO_LABEL_GIF } from "../scripts/mock-dan-label";
import {
  blankPlatePng,
  crownIconPng,
  medalPlatePng,
  myDonPng,
  rankIconPng,
  scorePanelPng,
  TITLE_PLATE,
  thumbnailPng,
  titlePlatePng,
} from "../scripts/mock-pictures";
import {
  createMemoryPictureStore,
  createPictureReader,
  DESKTOP_PICTURE_LIMITS,
  type HirobaEndpoints,
  offeredOf,
  offerKey,
  type PictureLimits,
  type PictureReadState,
  type PictureStore,
  pictureKeyPath,
} from "../src/hiroba-session";

const ORIGIN = "https://hiroba.test";
const IMG_ORIGIN = "https://img.test";
const ENDPOINTS: HirobaEndpoints = {
  hirobaOrigin: ORIGIN,
  idpHost: "id.test",
  idpDomain: "id.test",
  imgOrigin: IMG_ORIGIN,
};
const THUMB_URL = `${ORIGIN}/imgsrc_kisekae.php?cos=36&type=1`;
const WANT = { kind: "costumeItem", slot: 1, id: 36 } as const;
const OFFERED = new Set([offerKey(1, 36), offerKey(1, 4), offerKey(2, 21)]);
const LIMITS: PictureLimits = { jitterMs: 100, minGapMs: 0, timeoutMs: null, budget: 300 };
/** Signed in, the editor read, and no my page read yet. */
const STATE: PictureReadState = { signedIn: true, offered: OFFERED, owner: null, sources: null };
const PANEL = { level: 5 } as const;
const SET = {
  colorBody: 12,
  colorLimb: 12,
  colorFace: 5,
  costume1: 0,
  costume2: 0,
  costume3: 68,
  costume4: 0,
  costume5: 0,
};

type Answer = Awaited<ReturnType<Transport["send"]>>;

const png = (url = THUMB_URL, body: Uint8Array = thumbnailPng(1, 36)): Answer =>
  ok({ status: 200, url, headers: { "content-type": "image/png" }, body });

function setUp(
  options: {
    answer?: (request: TransportRequest, signal?: AbortSignal) => Promise<Answer>;
    state?: PictureReadState;
    limits?: PictureLimits;
    store?: PictureStore;
    endpoints?: HirobaEndpoints;
  } = {},
) {
  const sent: { request: TransportRequest; signal: AbortSignal | undefined }[] = [];
  const events: string[] = [];
  const transport: Transport = {
    async send(request, signal) {
      sent.push({ request, signal });
      events.push(`send ${new URL(request.url).search}`);
      return (options.answer ?? (async (asked) => png(asked.url)))(request, signal);
    },
  };
  const queue = {
    oneAtATime<A extends unknown[], R>(run: (...args: A) => Promise<R>) {
      return (...args: A) => {
        events.push("queue");
        return run(...args);
      };
    },
  };
  let state: PictureReadState = options.state ?? STATE;
  const store = options.store ?? createMemoryPictureStore();
  const reader = createPictureReader({
    transport,
    endpoints: options.endpoints ?? ENDPOINTS,
    store,
    queue,
    limits: options.limits ?? LIMITS,
    state: () => state,
    clock: {
      now: () => 0,
      sleep: async (ms) => {
        events.push(`sleep ${ms}`);
      },
    },
    random: () => 0.37,
  });
  return {
    reader,
    sent,
    events,
    store,
    setState: (next: PictureReadState) => {
      state = next;
    },
  };
}

const decode = (src: string) =>
  Uint8Array.from(atob(src.slice("data:image/png;base64,".length)), (c) => c.charCodeAt(0));

describe("createPictureReader, an item's thumbnail", () => {
  test("asks once, from the editor, as a browser's picture, after a pause outside the queue", async () => {
    const { reader, sent, events } = setUp();
    const read = await reader.read(WANT);
    expect(sent.map(({ request }) => request)).toEqual([
      {
        method: "GET",
        url: THUMB_URL,
        headers: {
          Referer: `${ORIGIN}/mypage_kisekae.php`,
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      },
    ]);
    expect(events).toEqual(["sleep 37", "queue", "send ?cos=36&type=1"]);
    expect(read.ok && read.value.src.startsWith("data:image/png;base64,")).toBe(true);
    expect(read.ok && decode(read.value.src)).toEqual(thumbnailPng(1, 36));
    expect(read.ok && [read.value.width, read.value.height]).toEqual([40, 40]);
  });

  test("answers a picture it keeps at once, never entering the queue", async () => {
    const { reader, sent, events } = setUp();
    const first = await reader.read(WANT);
    events.length = 0;
    const again = await reader.read({ ...WANT });
    expect(again).toEqual(first);
    expect(sent).toHaveLength(1);
    expect(events).toEqual([]);
  });

  test("shares one fetch between every call for the same picture while it is on its way", async () => {
    let release: () => void = () => undefined;
    const { reader, sent } = setUp({
      answer: (request) =>
        new Promise((resolve) => {
          release = () => resolve(png(request.url));
        }),
    });
    const one = reader.read(WANT);
    const two = reader.read(WANT);
    await Bun.sleep(1);
    release();
    expect(await one).toEqual(await two);
    expect(sent).toHaveLength(1);
  });

  test("sends nothing while signed out, or for an item the editor did not offer", async () => {
    const signedOut = setUp({ state: { ...STATE, signedIn: false } });
    expect(await signedOut.reader.read(WANT)).toEqual(err({ code: "costumeItem=notSignedIn" }));
    const { reader, sent } = setUp();
    expect(await reader.read({ ...WANT, id: 999 })).toEqual(
      err({ code: "costumeItem=notOffered" }),
    );
    // Offered in another slot is not offered in this one.
    expect(await reader.read({ ...WANT, id: 21 })).toEqual(err({ code: "costumeItem=notOffered" }));
    expect(signedOut.sent).toEqual([]);
    expect(sent).toEqual([]);
  });

  test("refuses unsent anything that is not a picture it may ask for", async () => {
    const { reader, sent } = setUp();
    for (const want of [
      { ...WANT, url: "https://elsewhere.test/" },
      { ...WANT, slot: 6 },
      { ...WANT, id: 1.5 },
      { kind: "titlePlate", url: `${ORIGIN}/imgsrc_titleplate.php` },
      { kind: "myDon", fn: "mydon_111111111111" },
      { kind: "scorePanel", level: 5 },
      null,
    ]) {
      expect(await reader.read(want)).toEqual(err({ code: "picture=refused" }));
    }
    expect(sent).toEqual([]);
  });

  test("sends nothing past the run's budget", async () => {
    const { reader, sent } = setUp({
      limits: { ...LIMITS, budget: 2 },
      answer: async () => ok({ status: 200, url: THUMB_URL, headers: {}, body: NO_LABEL_GIF }),
    });
    await reader.read(WANT);
    await reader.read({ ...WANT, id: 4 });
    expect(await reader.read(WANT)).toEqual(err({ code: "costumeItem=budgetSpent" }));
    expect(sent).toHaveLength(2);
  });

  test("sends nothing when the session went while the fetch waited its turn", async () => {
    const { reader, sent, setState } = setUp();
    const reading = reader.read(WANT);
    setState({ ...STATE, signedIn: false });
    expect(await reading).toEqual(err({ code: "costumeItem=notSignedIn" }));
    expect(sent).toEqual([]);
  });

  test("a failure is codes, never kept, never retried by itself, and never a host or a query", async () => {
    const { reader, sent } = setUp({
      answer: async () =>
        ok({
          status: 200,
          url: THUMB_URL,
          headers: { "content-type": "image/gif" },
          body: NO_LABEL_GIF,
        }),
    });
    const code = "costumeItem=notPng status=200 type=image/gif bytes=43";
    expect(await reader.read(WANT)).toEqual(err({ code }));
    expect(sent).toHaveLength(1);
    expect(await reader.read(WANT)).toEqual(err({ code }));
    expect(sent).toHaveLength(2);
  });

  test("refuses a picture that moved, naming the path only, and one of a size out of bounds", async () => {
    const moved = setUp({
      answer: async () => png("https://elsewhere.test/imgsrc_kisekae.php?cos=36"),
    });
    const movedCode = (await moved.reader.read(WANT)) as { error: { code: string } };
    const body = thumbnailPng(1, 36);
    expect(movedCode.error.code).toBe(
      `costumeItem=movedTo offHost status=200 type=image/png bytes=${body.byteLength}`,
    );
    const login = setUp({ answer: async () => png(`${ORIGIN}/login.php?from=cos%3D36`) });
    expect(((await login.reader.read(WANT)) as { error: { code: string } }).error.code).toBe(
      `costumeItem=movedTo path=/login.php status=200 type=image/png bytes=${body.byteLength}`,
    );
    const wide = thumbnailPng(1, 36);
    new DataView(wide.buffer).setUint32(16, 600);
    const huge = setUp({ answer: async () => png(THUMB_URL, wide) });
    const hugeCode = ((await huge.reader.read(WANT)) as { error: { code: string } }).error.code;
    expect(hugeCode).toBe(
      `costumeItem=badSize status=200 type=image/png bytes=${wide.byteLength} size=600x40`,
    );
    for (const code of [movedCode.error.code, hugeCode]) {
      expect(code).not.toMatch(/elsewhere|hiroba\.test|http|\?|cos=/);
    }
  });

  test("a request that fails is its kind alone", async () => {
    const { reader } = setUp({ answer: async () => err({ kind: "unreachable", url: THUMB_URL }) });
    expect(await reader.read(WANT)).toEqual(err({ code: "costumeItem=unreachable" }));
  });

  test("on the desktop, gives a fetch up after its timeout, and says so", async () => {
    const { reader, sent } = setUp({
      limits: { ...DESKTOP_PICTURE_LIMITS, timeoutMs: 20 },
      answer: (_request, signal) =>
        new Promise((resolve) => {
          signal?.addEventListener("abort", () =>
            resolve(err({ kind: "cancelled", url: THUMB_URL })),
          );
        }),
    });
    expect(await reader.read(WANT)).toEqual(err({ code: "costumeItem=timedOut" }));
    expect(sent[0]?.signal).toBeInstanceOf(AbortSignal);
    // Android leaves it to its transport: a native call cannot be stopped.
    const android = setUp();
    await android.reader.read(WANT);
    expect(android.sent[0]?.signal).toBeUndefined();
  });

  test("forgotten, a fetch on its way is neither shared nor kept", async () => {
    let release: () => void = () => undefined;
    const store = createMemoryPictureStore();
    const { reader, sent } = setUp({
      store,
      answer: (request) =>
        new Promise((resolve) => {
          release = () => resolve(png(request.url));
        }),
    });
    const before = reader.read(WANT);
    await Bun.sleep(1);
    reader.forget();
    release();
    expect((await before).ok).toBe(true);
    expect(await store.get({ scope: "shared", player: null, name: "v1/item/1/36" })).toBeNull();
    const after = reader.read(WANT);
    await Bun.sleep(1);
    release();
    await after;
    expect(sent).toHaveLength(2);
  });

  test("keeps a thumbnail for every account, under its slot and id", async () => {
    const store = createMemoryPictureStore();
    const { reader } = setUp({ store });
    await reader.read(WANT);
    const kept = await store.get({ scope: "shared", player: null, name: "v1/item/1/36" });
    expect(kept).toEqual(thumbnailPng(1, 36));
  });

  test("fetches a kept thumbnail again when it no longer passes, and keeps the new one", async () => {
    const store = createMemoryPictureStore();
    const key = { scope: "shared", player: null, name: "v1/item/1/36" } as const;
    // A file cut short: fewer bytes than any thumbnail has.
    await store.put(key, thumbnailPng(1, 36).subarray(0, 64));
    const { reader, sent } = setUp({ store });
    const read = await reader.read(WANT);
    expect(sent).toHaveLength(1);
    expect(read.ok && decode(read.value.src)).toEqual(thumbnailPng(1, 36));
    expect(await store.get(key)).toEqual(thumbnailPng(1, 36));
  });
});

describe("createPictureReader, the title plate", () => {
  const PLATE = { kind: "titlePlate" } as const;
  const PLATE_URL = `${ORIGIN}/imgsrc_titleplate.php`;
  const OWNER = "000000000000";
  const TITLE = "サンプルの称号";
  const readState = (title = TITLE, owner = OWNER): PictureReadState => ({
    ...STATE,
    owner,
    sources: {
      titlePlate: { form: "bare", title },
      scorePanel: PANEL,
      medalPlate: "notShown",
      myDon: "notShown",
    },
  });
  const plateOf = (title: string) => async (request: TransportRequest) =>
    png(request.url, titlePlatePng(title));
  const codeOf = async (read: Promise<unknown>) =>
    ((await read) as { error: { code: string } }).error.code;
  const keyOf = (title: string, owner = OWNER) => ({
    scope: "player" as const,
    player: owner,
    name: `v1/titleplate/bare/${encodeURIComponent(title)}`,
  });

  test("asks once, as my page does, for the bare plate, after a pause outside the queue", async () => {
    const { reader, sent, events } = setUp({ state: readState(), answer: plateOf(TITLE) });
    const read = await reader.read(PLATE);
    expect(sent.map(({ request }) => request)).toEqual([
      {
        method: "GET",
        url: PLATE_URL,
        headers: {
          Referer: `${ORIGIN}/mypage_top.php`,
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      },
    ]);
    expect(events).toEqual(["sleep 37", "queue", "send "]);
    expect(read.ok && decode(read.value.src)).toEqual(titlePlatePng(TITLE));
    expect(read.ok && [read.value.width, read.value.height]).toEqual([
      TITLE_PLATE.width,
      TITLE_PLATE.height,
    ]);
  });

  test("asks for the public form, by the page's own number, when my page wrote that", async () => {
    const { reader, sent } = setUp({
      state: {
        ...readState(),
        sources: {
          titlePlate: { form: "byTaikoNo", title: TITLE },
          scorePanel: PANEL,
          medalPlate: "notShown",
          myDon: "notShown",
        },
      },
      answer: plateOf(TITLE),
    });
    expect((await reader.read(PLATE)).ok).toBe(true);
    expect(sent.map(({ request }) => request.url)).toEqual([`${PLATE_URL}?taiko_no=${OWNER}`]);
  });

  test("keeps the public form at once: it is the same with a session or without one", async () => {
    const store = createMemoryPictureStore();
    const { reader } = setUp({
      store,
      state: {
        ...readState(),
        sources: {
          titlePlate: { form: "byTaikoNo", title: TITLE },
          scorePanel: PANEL,
          medalPlate: "notShown",
          myDon: "notShown",
        },
      },
      answer: plateOf(TITLE),
    });
    await reader.read(PLATE);
    const name = `v1/titleplate/byTaikoNo/${encodeURIComponent(TITLE)}`;
    expect(await store.get({ ...keyOf(TITLE), name })).toEqual(titlePlatePng(TITLE));
  });

  test("sends nothing before my page is read, when it showed none, or one of another form", async () => {
    const unread = setUp();
    expect(await unread.reader.read(PLATE)).toEqual(err({ code: "titlePlate=notRead" }));
    for (const titlePlate of ["notShown", "unexpectedSrc"] as const) {
      const { reader, sent } = setUp({
        state: {
          ...readState(),
          sources: { titlePlate, scorePanel: PANEL, medalPlate: "notShown", myDon: "notShown" },
        },
      });
      expect(await reader.read(PLATE)).toEqual(err({ code: `titlePlate=${titlePlate}` }));
      expect(sent).toEqual([]);
    }
    const signedOut = setUp({ state: { ...readState(), signedIn: false } });
    expect(await signedOut.reader.read(PLATE)).toEqual(err({ code: "titlePlate=notSignedIn" }));
    expect(unread.sent).toEqual([]);
    expect(signedOut.sent).toEqual([]);
  });

  test("keeps a plate for good under its player and its title: a new title is a new plate", async () => {
    const store = createMemoryPictureStore();
    const { reader, sent, setState } = setUp({
      store,
      state: readState(),
      answer: async (request) => png(request.url, titlePlatePng(TITLE)),
    });
    await reader.read(PLATE);
    await reader.read(PLATE);
    expect(sent).toHaveLength(1);
    await reader.confirm(OWNER);
    expect(await store.get(keyOf(TITLE))).toEqual(titlePlatePng(TITLE));
    reader.forget();
    await reader.read(PLATE);
    expect(sent).toHaveLength(1);
    setState(readState("別のサンプル称号"));
    await reader.read(PLATE);
    expect(sent).toHaveLength(2);
    setState(readState(TITLE, "111111111111"));
    await reader.read(PLATE);
    expect(sent).toHaveLength(3);
    setState(readState());
    await reader.read(PLATE);
    expect(sent).toHaveLength(3);
  });

  test("keeps a plate under the title my page shows when its turn comes, not when asked", async () => {
    const store = createMemoryPictureStore();
    const other = "別のサンプル称号";
    const { reader, sent, setState } = setUp({ store, state: readState(), answer: plateOf(other) });
    const reading = reader.read(PLATE);
    setState(readState(other));
    expect((await reading).ok).toBe(true);
    expect(sent).toHaveLength(1);
    await reader.confirm(OWNER);
    expect(await store.get(keyOf(TITLE))).toBeNull();
    expect(await store.get(keyOf(other))).toEqual(titlePlatePng(other));
  });

  test("answers from the store when the title my page shows at its turn is one kept", async () => {
    const store = createMemoryPictureStore();
    const other = "別のサンプル称号";
    await store.put(keyOf(other), titlePlatePng(other));
    const { reader, sent, setState } = setUp({ store, state: readState(), answer: plateOf(TITLE) });
    const reading = reader.read(PLATE);
    setState(readState(other));
    const read = await reading;
    expect(sent).toEqual([]);
    expect(read.ok && decode(read.value.src)).toEqual(titlePlatePng(other));
  });

  test("a GIF, or a PNG too small or too tall, is a failure with codes that hold no number", async () => {
    const gif = setUp({
      state: readState(),
      answer: async () =>
        ok({
          status: 200,
          url: PLATE_URL,
          headers: { "content-type": "image/gif" },
          body: NO_LABEL_GIF,
        }),
    });
    const tinyPng = new Uint8Array(
      encode({ width: 8, height: 8, data: new Uint8Array(8 * 8 * 4), channels: 4 }),
    );
    const tall = titlePlatePng(TITLE);
    new DataView(tall.buffer).setUint32(20, 401);
    const tallRead = setUp({ state: readState(), answer: async () => png(PLATE_URL, tall) });
    const tiny = setUp({
      state: readState(),
      answer: async () => png(PLATE_URL, tinyPng),
    });
    const codes = [
      await codeOf(gif.reader.read(PLATE)),
      await codeOf(tallRead.reader.read(PLATE)),
      await codeOf(tiny.reader.read(PLATE)),
    ];
    expect(codes).toEqual([
      "titlePlate=notPng status=200 type=image/gif bytes=43",
      `titlePlate=badSize status=200 type=image/png bytes=${tall.byteLength} size=600x401`,
      `titlePlate=tooSmall status=200 type=image/png bytes=${tinyPng.byteLength}`,
    ]);
    for (const code of codes) {
      expect(code).not.toMatch(/000000000000|hiroba\.test|http|\?/);
    }
  });

  test("a plate that ended on the login page names its path, never the query", async () => {
    const { reader } = setUp({
      state: readState(),
      answer: async () =>
        ok({
          status: 200,
          url: `${ORIGIN}/login.php?taiko_no=${OWNER}`,
          headers: { "content-type": "text/html" },
          body: new TextEncoder().encode("<html></html>"),
        }),
    });
    expect(await codeOf(reader.read(PLATE))).toBe(
      "titlePlate=notPng path=/login.php status=200 type=text/html bytes=13",
    );
  });

  test("the blank plate a lost session gets is a PNG like any other: nothing tells it apart", async () => {
    const { reader } = setUp({
      state: readState(),
      answer: async () => png(PLATE_URL, blankPlatePng()),
    });
    expect((await reader.read(PLATE)).ok).toBe(true);
  });

  test("keeps a bare plate only once a later read confirms it, and answers repeats till then", async () => {
    const store = createMemoryPictureStore();
    const { reader, sent } = setUp({ store, state: readState(), answer: plateOf(TITLE) });
    await reader.read(PLATE);
    const again = await reader.read(PLATE);
    expect(sent).toHaveLength(1);
    expect(again.ok && decode(again.value.src)).toEqual(titlePlatePng(TITLE));
    expect(await store.get(keyOf(TITLE))).toBeNull();
    await reader.confirm(OWNER);
    expect(await store.get(keyOf(TITLE))).toEqual(titlePlatePng(TITLE));
  });

  test("fetches a kept plate again when it no longer passes, and keeps the new one once confirmed", async () => {
    const store = createMemoryPictureStore();
    // A file cut short: fewer bytes than any plate has.
    await store.put(keyOf(TITLE), titlePlatePng(TITLE).subarray(0, 512));
    const { reader, sent } = setUp({ store, state: readState(), answer: plateOf(TITLE) });
    const read = await reader.read(PLATE);
    expect(sent).toHaveLength(1);
    expect(read.ok && decode(read.value.src)).toEqual(titlePlatePng(TITLE));
    await reader.confirm(OWNER);
    expect(await store.get(keyOf(TITLE))).toEqual(titlePlatePng(TITLE));
  });

  test("a plate fetched as the session ended unseen is not kept past it", async () => {
    const store = createMemoryPictureStore();
    let body = blankPlatePng();
    const { reader, sent } = setUp({
      store,
      state: readState(),
      answer: async (request) => png(request.url, body),
    });
    // Hiroba ended the session after the read and before the plate: a blank plate comes.
    expect((await reader.read(PLATE)).ok).toBe(true);
    reader.forget();
    await reader.confirm(OWNER);
    body = titlePlatePng(TITLE);
    const read = await reader.read(PLATE);
    expect(sent).toHaveLength(2);
    expect(read.ok && decode(read.value.src)).toEqual(titlePlatePng(TITLE));
    expect(await store.get(keyOf(TITLE))).toBeNull();
  });

  test("a read of another player's page keeps none of the plates before it", async () => {
    const store = createMemoryPictureStore();
    const { reader } = setUp({ store, state: readState(), answer: plateOf(TITLE) });
    await reader.read(PLATE);
    await reader.confirm("111111111111");
    await reader.confirm(OWNER);
    expect(await store.get(keyOf(TITLE))).toBeNull();
  });
});

describe("createPictureReader, the score panel's art", () => {
  const ART = { kind: "scorePanel" } as const;
  const ART_URL = `${ORIGIN}/image/sp/640/total_score_image_5.png`;
  const readState = (owner = "000000000000", level = 5): PictureReadState => ({
    ...STATE,
    owner,
    sources: {
      titlePlate: "notShown",
      scorePanel: { level },
      medalPlate: "notShown",
      myDon: "notShown",
    },
  });
  const keyOf = (level = 5) => ({
    scope: "shared" as const,
    player: null,
    name: `v1/panel/${level}`,
  });
  const codeOf = async (read: Promise<unknown>) =>
    ((await read) as { error: { code: string } }).error.code;

  test("asks once, as my page does, for the art of the level my page showed", async () => {
    const { reader, sent, events } = setUp({
      state: readState(),
      answer: async (request) => png(request.url, scorePanelPng(5)),
    });
    const read = await reader.read(ART);
    expect(sent.map(({ request }) => request)).toEqual([
      {
        method: "GET",
        url: ART_URL,
        headers: {
          Referer: `${ORIGIN}/mypage_top.php`,
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      },
    ]);
    expect(events).toEqual(["sleep 37", "queue", "send "]);
    expect(read.ok && decode(read.value.src)).toEqual(scorePanelPng(5));
    expect(read.ok && [read.value.width, read.value.height]).toEqual([600, 356]);
  });

  test("keeps the art for good and for every account, by its level", async () => {
    const store = createMemoryPictureStore();
    const { reader, sent, setState } = setUp({
      store,
      state: readState(),
      answer: async (request) => png(request.url, scorePanelPng(5)),
    });
    await reader.read(ART);
    await reader.read(ART);
    expect(sent).toHaveLength(1);
    expect(await store.get(keyOf())).toEqual(scorePanelPng(5));
    reader.forget();
    setState(readState("111111111111"));
    expect((await reader.read(ART)).ok).toBe(true);
    expect(sent).toHaveLength(1);
    setState(readState("111111111111", 4));
    await reader.read(ART);
    expect(sent.map(({ request }) => request.url)).toEqual([
      ART_URL,
      `${ORIGIN}/image/sp/640/total_score_image_4.png`,
    ]);
  });

  test("sends nothing before my page is read, or for a level that failed its check", async () => {
    const unread = setUp();
    expect(await unread.reader.read(ART)).toEqual(err({ code: "scorePanel=notRead" }));
    const unexpected = setUp({
      state: {
        ...readState(),
        sources: {
          titlePlate: "notShown",
          scorePanel: "unexpectedSrc",
          medalPlate: "notShown",
          myDon: "notShown",
        },
      },
    });
    expect(await unexpected.reader.read(ART)).toEqual(err({ code: "scorePanel=unexpectedSrc" }));
    const signedOut = setUp({ state: { ...readState(), signedIn: false } });
    expect(await signedOut.reader.read(ART)).toEqual(err({ code: "scorePanel=notSignedIn" }));
    expect([...unread.sent, ...unexpected.sent, ...signedOut.sent]).toEqual([]);
  });

  test("a 404, or a picture too small to be the art, is a failure with codes, never kept", async () => {
    const small = thumbnailPng(1, 36);
    const missing = setUp({
      state: readState(),
      answer: async () =>
        ok({
          status: 404,
          url: ART_URL,
          headers: { "content-type": "text/plain;charset=utf-8" },
          body: new TextEncoder().encode("not found"),
        }),
    });
    const thumbnail = setUp({ state: readState(), answer: async () => png(ART_URL, small) });
    expect([
      await codeOf(missing.reader.read(ART)),
      await codeOf(thumbnail.reader.read(ART)),
    ]).toEqual([
      "scorePanel=notPng status=404 type=text/plain;charset=utf-8 bytes=9",
      `scorePanel=tooSmall status=200 type=image/png bytes=${small.byteLength}`,
    ]);
    expect(await missing.store.get(keyOf())).toBeNull();
    expect(await thumbnail.store.get(keyOf())).toBeNull();
  });
});

describe("createPictureReader, the rank and crown icons", () => {
  const RANK = { kind: "rankIcon", rank: 5 } as const;
  const rankUrl = (rank: number) => `${ORIGIN}/image/sp/640/best_score_rank_${rank}_640.png`;
  const crownUrl = (number: number) => `${ORIGIN}/image/sp/640/crown_0${number}_640.png`;
  const keyOf = (name: string) => ({ scope: "shared" as const, player: null, name: `v1/${name}` });
  const codeOf = async (read: Promise<unknown>) =>
    ((await read) as { error: { code: string } }).error.code;

  test("asks once, as my page does, for a rank's icon by its image number", async () => {
    const { reader, sent, events } = setUp({
      answer: async (request) => png(request.url, rankIconPng(5)),
    });
    const read = await reader.read(RANK);
    expect(sent.map(({ request }) => request)).toEqual([
      {
        method: "GET",
        url: rankUrl(5),
        headers: {
          Referer: `${ORIGIN}/mypage_top.php`,
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      },
    ]);
    expect(events).toEqual(["sleep 37", "queue", "send "]);
    expect(read.ok && decode(read.value.src)).toEqual(rankIconPng(5));
    expect(read.ok && [read.value.width, read.value.height]).toEqual([128, 96]);
  });

  type CrownCase = [crown: "silver" | "gold" | "donderful", number: number];
  test.each<CrownCase>([
    ["gold", 2],
    ["silver", 3],
    ["donderful", 4],
  ])(
    "asks for the %s crown's icon as crown_0%p, where gold comes before silver",
    async (crown, number) => {
      const { reader, sent } = setUp({
        answer: async (request) => png(request.url, crownIconPng(number)),
      });
      const read = await reader.read({ kind: "crownIcon", crown });
      expect(sent.map(({ request }) => request.url)).toEqual([crownUrl(number)]);
      expect(read.ok && decode(read.value.src)).toEqual(crownIconPng(number));
      expect(read.ok && [read.value.width, read.value.height]).toEqual([52, 59]);
    },
  );

  test("keeps an icon for good and for every account, asking for each one once", async () => {
    const store = createMemoryPictureStore();
    const { reader, sent, setState } = setUp({
      store,
      answer: async (request) => png(request.url, rankIconPng(5)),
    });
    await reader.read(RANK);
    await reader.read({ ...RANK });
    expect(sent).toHaveLength(1);
    expect(await store.get(keyOf("rank/5"))).toEqual(rankIconPng(5));
    reader.forget();
    setState({ ...STATE, owner: "111111111111" });
    expect((await reader.read(RANK)).ok).toBe(true);
    expect(sent).toHaveLength(1);
    await reader.read({ kind: "rankIcon", rank: 6 });
    expect(sent.map(({ request }) => request.url)).toEqual([rankUrl(5), rankUrl(6)]);
  });

  test("keeps a crown under its own name, apart from every rank", async () => {
    const store = createMemoryPictureStore();
    const { reader } = setUp({
      store,
      answer: async (request) => png(request.url, crownIconPng(2)),
    });
    await reader.read({ kind: "crownIcon", crown: "gold" });
    expect(await store.get(keyOf("crown/gold"))).toEqual(crownIconPng(2));
    expect(await store.get(keyOf("rank/2"))).toBeNull();
  });

  test("needs a session but no read of my page: its address does not depend on the page", async () => {
    const { reader, sent } = setUp({
      answer: async (request) => png(request.url, rankIconPng(5)),
    });
    expect((await reader.read(RANK)).ok).toBe(true);
    const signedOut = setUp({ state: { ...STATE, signedIn: false } });
    expect(await signedOut.reader.read(RANK)).toEqual(err({ code: "rankIcon=notSignedIn" }));
    expect(sent).toHaveLength(1);
    expect(signedOut.sent).toEqual([]);
  });

  test("refuses unsent a rank or a crown Hiroba has no icon for, and any address", async () => {
    const { reader, sent } = setUp();
    for (const want of [
      { kind: "rankIcon", rank: 1 },
      { kind: "rankIcon", rank: 9 },
      { kind: "rankIcon", rank: 5, url: rankUrl(5) },
      { kind: "crownIcon", crown: "bronze" },
      { kind: "crownIcon", crown: "gold", src: "image/sp/640/crown_02_640.png" },
    ]) {
      expect(await reader.read(want)).toEqual(err({ code: "picture=refused" }));
    }
    expect(sent).toEqual([]);
  });

  test("a 404, a placeholder or an icon of another size is a failure with codes, never kept", async () => {
    const missing = setUp({
      answer: async () =>
        ok({
          status: 404,
          url: rankUrl(5),
          headers: { "content-type": "text/plain;charset=utf-8" },
          body: new TextEncoder().encode("not found"),
        }),
    });
    const placeholder = setUp({
      answer: async () =>
        ok({
          status: 200,
          url: rankUrl(5),
          headers: { "content-type": "image/gif" },
          body: NO_LABEL_GIF,
        }),
    });
    const wide = rankIconPng(5);
    new DataView(wide.buffer).setUint32(16, 600);
    const huge = setUp({ answer: async () => png(rankUrl(5), wide) });
    expect([
      await codeOf(missing.reader.read(RANK)),
      await codeOf(placeholder.reader.read(RANK)),
      await codeOf(huge.reader.read(RANK)),
    ]).toEqual([
      "rankIcon=notPng status=404 type=text/plain;charset=utf-8 bytes=9",
      "rankIcon=notPng status=200 type=image/gif bytes=43",
      `rankIcon=badSize status=200 type=image/png bytes=${wide.byteLength} size=600x96`,
    ]);
    for (const { store } of [missing, placeholder, huge]) {
      expect(await store.get(keyOf("rank/5"))).toBeNull();
    }
  });

  test("a failure is asked for again, never retried by itself", async () => {
    const { reader, sent } = setUp({ answer: async () => err({ kind: "unreachable", url: "" }) });
    expect(await reader.read(RANK)).toEqual(err({ code: "rankIcon=unreachable" }));
    expect(await reader.read(RANK)).toEqual(err({ code: "rankIcon=unreachable" }));
    expect(sent).toHaveLength(2);
  });
});

describe("createPictureReader, the どんメダル plate", () => {
  const MEDAL = { kind: "medalPlate" } as const;
  const ID = "0123456789abcdef0123456789abcdef0123456789abcdef";
  const NEXT_SEASON = "fedcba9876543210fedcba9876543210fedcba9876543210";
  const MEDAL_URL = `${ORIGIN}/imgsrc_tokenplate.php?id=${ID}`;
  const OWNER = "000000000000";
  type Progress = "collecting" | "complete";
  const readState = (id = ID, progress: Progress = "collecting", owner = OWNER) => ({
    ...STATE,
    owner,
    sources: {
      titlePlate: "notShown" as const,
      scorePanel: PANEL,
      medalPlate: { id, progress },
      myDon: "notShown" as const,
    },
  });
  const plates = (state: () => PictureReadState) => async (request: TransportRequest) => {
    const shown = state().sources?.medalPlate;
    const complete = typeof shown === "object" && shown.progress === "complete";
    const id = new URL(request.url).searchParams.get("id") ?? "";
    return png(request.url, medalPlatePng(id, complete));
  };
  const keyOf = (id = ID, progress: Progress = "collecting", owner = OWNER) => ({
    scope: "player" as const,
    player: owner,
    name: `v1/tokenplate/${id}/${progress}`,
  });
  const codeOf = async (read: Promise<unknown>) =>
    ((await read) as { error: { code: string } }).error.code;

  test("asks once, as my page does, for the plate by the id my page showed", async () => {
    const { reader, sent, events } = setUp({
      state: readState(),
      answer: async (request) => png(request.url, medalPlatePng(ID, false)),
    });
    const read = await reader.read(MEDAL);
    expect(sent.map(({ request }) => request)).toEqual([
      {
        method: "GET",
        url: MEDAL_URL,
        headers: {
          Referer: `${ORIGIN}/mypage_top.php`,
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      },
    ]);
    expect(events).toEqual(["sleep 37", "queue", `send ?id=${ID}`]);
    expect(read.ok && decode(read.value.src)).toEqual(medalPlatePng(ID, false));
    expect(read.ok && [read.value.width, read.value.height]).toEqual([600, 100]);
  });

  test("sends nothing before my page is read, when it showed none, or one of another form", async () => {
    const unread = setUp();
    expect(await unread.reader.read(MEDAL)).toEqual(err({ code: "medalPlate=notRead" }));
    for (const medalPlate of ["notShown", "unexpectedSrc"] as const) {
      const { reader, sent } = setUp({
        state: {
          ...readState(),
          sources: { titlePlate: "notShown", scorePanel: PANEL, medalPlate, myDon: "notShown" },
        },
      });
      expect(await reader.read(MEDAL)).toEqual(err({ code: `medalPlate=${medalPlate}` }));
      expect(sent).toEqual([]);
    }
    const signedOut = setUp({ state: { ...readState(), signedIn: false } });
    expect(await signedOut.reader.read(MEDAL)).toEqual(err({ code: "medalPlate=notSignedIn" }));
    expect(unread.sent).toEqual([]);
    expect(signedOut.sent).toEqual([]);
  });

  test("keeps a plate for good at once, under its player, its id and where the season stands", async () => {
    const store = createMemoryPictureStore();
    let state: PictureReadState = readState();
    const { reader, sent, setState } = setUp({ store, state, answer: plates(() => state) });
    const move = (next: PictureReadState) => {
      state = next;
      setState(next);
    };
    await reader.read(MEDAL);
    await reader.read(MEDAL);
    expect(sent).toHaveLength(1);
    // Keyed by its id, it is the same with a session or without one: kept with no read to confirm.
    expect(await store.get(keyOf())).toEqual(medalPlatePng(ID, false));
    expect(pictureKeyPath(keyOf())).not.toContain(ID);
    reader.forget();
    await reader.read(MEDAL);
    expect(sent).toHaveLength(1);
    move(readState(ID, "complete"));
    await reader.read(MEDAL);
    move(readState(NEXT_SEASON));
    await reader.read(MEDAL);
    expect(sent).toHaveLength(3);
    expect(await store.get(keyOf(ID, "complete"))).toEqual(medalPlatePng(ID, true));
    move(readState(ID, "collecting", "111111111111"));
    await reader.read(MEDAL);
    expect(sent).toHaveLength(4);
    move(readState());
    await reader.read(MEDAL);
    expect(sent).toHaveLength(4);
  });

  test("a failure is codes that hold neither the id nor the query", async () => {
    const gif = setUp({
      state: readState(),
      answer: async () =>
        ok({
          status: 200,
          url: MEDAL_URL,
          headers: { "content-type": "image/gif" },
          body: NO_LABEL_GIF,
        }),
    });
    const login = setUp({
      state: readState(),
      answer: async () =>
        ok({
          status: 200,
          url: `${ORIGIN}/login.php?back=${encodeURIComponent(MEDAL_URL)}`,
          headers: { "content-type": "text/html" },
          body: new TextEncoder().encode("<html></html>"),
        }),
    });
    const codes = [await codeOf(gif.reader.read(MEDAL)), await codeOf(login.reader.read(MEDAL))];
    expect(codes).toEqual([
      "medalPlate=notPng status=200 type=image/gif bytes=43",
      "medalPlate=notPng path=/login.php status=200 type=text/html bytes=13",
    ]);
    for (const code of codes) {
      expect(code).not.toMatch(/0123456789abcdef|000000000000|hiroba\.test|http|\?|id=/);
    }
    expect(await gif.store.get(keyOf())).toBeNull();
  });
});

describe("createPictureReader, the My Don portrait", () => {
  const MY_DON = { kind: "myDon" } as const;
  const OWNER = "000000000000";
  const OTHER = "111111111111";
  const PORTRAIT_URL = `${IMG_ORIGIN}/imgsrc.php?v=&kind=mydon&fn=mydon_${OWNER}`;
  const BEFORE = [12, 12, 5, 0, 0, 68, 0, 0];
  const AFTER = [12, 12, 3, 0, 0, 68, 0, 0];
  const readState = (owner = OWNER): PictureReadState => ({
    ...STATE,
    owner,
    sources: {
      titlePlate: "notShown",
      scorePanel: PANEL,
      medalPlate: "notShown",
      myDon: { v: "" },
    },
  });
  const keyOf = (owner = OWNER) => ({ scope: "player" as const, player: owner, name: "v1/mydon" });
  const portraitOf = (set: () => readonly number[]) => async (request: TransportRequest) =>
    png(request.url, myDonPng(set()));
  const GIF: Answer = ok({
    status: 200,
    url: PORTRAIT_URL,
    headers: { "content-type": "image/gif" },
    body: NO_LABEL_GIF,
  });
  const codeOf = async (read: Promise<unknown>) =>
    ((await read) as { error: { code: string } }).error.code;

  test("asks once, off Hiroba, as my page does: its origin alone as the Referer", async () => {
    const { reader, sent, events } = setUp({
      state: readState(),
      answer: portraitOf(() => BEFORE),
    });
    const read = await reader.read(MY_DON);
    expect(sent.map(({ request }) => request)).toEqual([
      {
        method: "GET",
        url: PORTRAIT_URL,
        headers: {
          Referer: `${ORIGIN}/`,
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      },
    ]);
    expect(events).toEqual(["sleep 37", "queue", `send ?v=&kind=mydon&fn=mydon_${OWNER}`]);
    expect(read.ok && decode(read.value.src)).toEqual(myDonPng(BEFORE));
    expect(read.ok && [read.value.width, read.value.height]).toEqual([290, 290]);
  });

  test("sends nothing with no picture host, before my page is read, or when it showed none", async () => {
    const noHost = setUp({ state: readState(), endpoints: { ...ENDPOINTS, imgOrigin: null } });
    expect(await noHost.reader.read(MY_DON)).toEqual(err({ code: "myDon=noHost" }));
    const unread = setUp();
    expect(await unread.reader.read(MY_DON)).toEqual(err({ code: "myDon=notRead" }));
    for (const myDon of ["notShown", "unexpectedSrc"] as const) {
      const { reader, sent } = setUp({
        state: {
          ...readState(),
          sources: { titlePlate: "notShown", scorePanel: PANEL, medalPlate: "notShown", myDon },
        },
      });
      expect(await reader.read(MY_DON)).toEqual(err({ code: `myDon=${myDon}` }));
      expect(sent).toEqual([]);
    }
    const signedOut = setUp({ state: { ...readState(), signedIn: false } });
    expect(await signedOut.reader.read(MY_DON)).toEqual(err({ code: "myDon=notSignedIn" }));
    expect([...noHost.sent, ...unread.sent, ...signedOut.sent]).toEqual([]);
  });

  test("keeps the portrait at once under its player, and answers it from then on", async () => {
    const store = createMemoryPictureStore();
    const { reader, sent, setState } = setUp({
      store,
      state: readState(),
      answer: portraitOf(() => BEFORE),
    });
    reader.myPageAsked();
    await reader.read(MY_DON);
    await reader.read(MY_DON);
    expect(sent).toHaveLength(1);
    expect(await store.get(keyOf())).toEqual(myDonPng(BEFORE));
    expect(pictureKeyPath(keyOf())).not.toContain(OWNER);
    reader.forget();
    reader.myPageAsked();
    await reader.read(MY_DON);
    expect(sent).toHaveLength(1);
    setState(readState(OTHER));
    await reader.read(MY_DON);
    expect(sent).toHaveLength(2);
  });

  test("fetches it anew once after each read of my page but a session's first, keeping the new one", async () => {
    const store = createMemoryPictureStore();
    let wearing = BEFORE;
    const { reader, sent } = setUp({
      store,
      state: readState(),
      answer: portraitOf(() => wearing),
    });
    reader.myPageAsked();
    await reader.read(MY_DON);
    wearing = AFTER;
    reader.myPageAsked();
    const renewed = await reader.read(MY_DON);
    expect(renewed.ok && decode(renewed.value.src)).toEqual(myDonPng(AFTER));
    expect(await reader.read(MY_DON)).toEqual(renewed);
    expect(sent).toHaveLength(2);
    expect(await store.get(keyOf())).toEqual(myDonPng(AFTER));
    reader.forget();
    reader.myPageAsked();
    expect(await reader.read(MY_DON)).toEqual(renewed);
    expect(sent).toHaveLength(2);
  });

  test("fetches it anew once after a costume write applies, whoever signs in next", async () => {
    const store = createMemoryPictureStore();
    let wearing = BEFORE;
    const { reader, sent } = setUp({
      store,
      state: readState(),
      answer: portraitOf(() => wearing),
    });
    reader.myPageAsked();
    await reader.read(MY_DON);
    wearing = AFTER;
    reader.costumeChanged();
    reader.forget();
    reader.myPageAsked();
    const renewed = await reader.read(MY_DON);
    expect(renewed.ok && decode(renewed.value.src)).toEqual(myDonPng(AFTER));
    expect(await reader.read(MY_DON)).toEqual(renewed);
    expect(sent).toHaveLength(2);
    expect(await store.get(keyOf())).toEqual(myDonPng(AFTER));
  });

  test("a portrait fetched anew that does not come leaves the one kept, until the next change", async () => {
    const store = createMemoryPictureStore();
    let answer: Answer = png(PORTRAIT_URL, myDonPng(BEFORE));
    const { reader, sent } = setUp({ store, state: readState(), answer: async () => answer });
    reader.myPageAsked();
    const first = await reader.read(MY_DON);
    reader.myPageAsked();
    answer = GIF;
    expect(await reader.read(MY_DON)).toEqual(first);
    expect(await reader.read(MY_DON)).toEqual(first);
    reader.forget();
    reader.myPageAsked();
    expect(await reader.read(MY_DON)).toEqual(first);
    expect(sent).toHaveLength(2);
    reader.costumeChanged();
    answer = err({ kind: "unreachable", url: PORTRAIT_URL });
    expect(await reader.read(MY_DON)).toEqual(first);
    expect(await reader.read(MY_DON)).toEqual(first);
    expect(sent).toHaveLength(3);
    reader.myPageAsked();
    answer = png(PORTRAIT_URL, myDonPng(AFTER));
    const renewed = await reader.read(MY_DON);
    expect(renewed.ok && decode(renewed.value.src)).toEqual(myDonPng(AFTER));
    expect(sent).toHaveLength(4);
  });

  test("past the run's budget, a portrait to fetch anew answers the one kept, unsent", async () => {
    const { reader, sent } = setUp({
      state: readState(),
      limits: { ...LIMITS, budget: 1 },
      answer: portraitOf(() => BEFORE),
    });
    reader.myPageAsked();
    const first = await reader.read(MY_DON);
    reader.myPageAsked();
    expect(await reader.read(MY_DON)).toEqual(first);
    expect(sent).toHaveLength(1);
  });

  test("one on its way as the portrait may change is fetched once more when next asked for", async () => {
    let release: () => void = () => undefined;
    let wearing = BEFORE;
    const { reader, sent } = setUp({
      state: readState(),
      answer: (request) =>
        new Promise((resolve) => {
          const drawn = myDonPng(wearing);
          release = () => resolve(png(request.url, drawn));
        }),
    });
    reader.myPageAsked();
    const onItsWay = reader.read(MY_DON);
    await Bun.sleep(1);
    wearing = AFTER;
    reader.myPageAsked();
    release();
    await onItsWay;
    const renewing = reader.read(MY_DON);
    await Bun.sleep(1);
    release();
    const renewed = await renewing;
    expect(renewed.ok && decode(renewed.value.src)).toEqual(myDonPng(AFTER));
    expect(sent).toHaveLength(2);
  });

  test("a failure is codes that hold neither a host, the taiko number nor the query", async () => {
    const gif = setUp({ state: readState(), answer: async () => GIF });
    const login = setUp({
      state: readState(),
      answer: async () =>
        ok({
          status: 200,
          url: `${ORIGIN}/login.php?back=${encodeURIComponent(PORTRAIT_URL)}`,
          headers: { "content-type": "text/html" },
          body: new TextEncoder().encode("<html></html>"),
        }),
    });
    const codes = [await codeOf(gif.reader.read(MY_DON)), await codeOf(login.reader.read(MY_DON))];
    expect(codes).toEqual([
      "myDon=notPng status=200 type=image/gif bytes=43",
      "myDon=notPng offHost path=/login.php status=200 type=text/html bytes=13",
    ]);
    for (const code of codes) {
      expect(code).not.toMatch(/000000000000|img\.test|hiroba\.test|http|\?|mydon_|fn=/);
    }
    expect(await gif.store.get(keyOf())).toBeNull();
    // A portrait moved to an address naming its player: the path is in the code, the number is not.
    const body = myDonPng(BEFORE);
    const movedTo = (url: string) =>
      codeOf(setUp({ state: readState(), answer: async () => png(url, body) }).reader.read(MY_DON));
    expect(await movedTo(`${IMG_ORIGIN}/mydon/mydon_${OWNER}.png`)).toBe(
      `myDon=movedTo path=/mydon/mydon_#.png status=200 type=image/png bytes=${body.byteLength}`,
    );
    expect(await movedTo(`https://elsewhere.test/c/${OWNER}/mydon.png`)).toBe(
      `myDon=movedTo offHost path=/c/#/mydon.png status=200 type=image/png bytes=${body.byteLength}`,
    );
  });
});

describe("offeredOf", () => {
  test("offers each slot's owned items and the item worn in it, nothing else", () => {
    const offered = offeredOf({
      state: { ...SET, costume1: 999 },
      palette: [],
      slots: [[4, 36], [21], [], [37], [140]],
    });
    expect([...offered].sort()).toEqual(
      ["1:4", "1:36", "1:999", "2:21", "3:68", "4:37", "5:140"].sort(),
    );
  });

  test("offers no item for an empty slot, はずす", () => {
    expect([
      ...offeredOf({ state: { ...SET, costume3: 0 }, palette: [], slots: [[], [], [], [], []] }),
    ]).toEqual([]);
  });
});
