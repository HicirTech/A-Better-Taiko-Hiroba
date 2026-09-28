/**
 * The platform's reader of Hiroba's pictures, against a fake transport, a spy queue and a fake
 * clock: what it sends, when it sends nothing, and what crosses back.
 */
import { describe, expect, test } from "bun:test";
import { err, ok, type Transport, type TransportRequest } from "@abth/core";

import { NO_LABEL_GIF } from "../scripts/mock-dan-label";
import { thumbnailPng } from "../scripts/mock-pictures";
import {
  createMemoryPictureStore,
  createPictureReader,
  DESKTOP_PICTURE_LIMITS,
  offeredOf,
  offerKey,
  type PictureLimits,
  type PictureReadState,
  type PictureStore,
} from "../src/hiroba-session";

const ORIGIN = "https://hiroba.test";
const ENDPOINTS = { hirobaOrigin: ORIGIN, idpHost: "id.test", idpDomain: "id.test" };
const THUMB_URL = `${ORIGIN}/imgsrc_kisekae.php?cos=36&type=1`;
const WANT = { kind: "costumeItem", slot: 1, id: 36 } as const;
const OFFERED = new Set([offerKey(1, 36), offerKey(1, 4), offerKey(2, 21)]);
const LIMITS: PictureLimits = { jitterMs: 100, minGapMs: 0, timeoutMs: null, budget: 300 };
/** Signed in, the editor read, and no my page read yet. */
const STATE: PictureReadState = { signedIn: true, offered: OFFERED, owner: null, sources: null };
/** A set wearing one piece, in からだ (slot 3), and nothing else. */
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

/** Everything a reader under test reaches, and what it did with it. */
function setUp(
  options: {
    answer?: (request: TransportRequest, signal?: AbortSignal) => Promise<Answer>;
    state?: PictureReadState;
    limits?: PictureLimits;
    store?: PictureStore;
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
    endpoints: ENDPOINTS,
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
      { kind: "titlePlate" },
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
