import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { err, ok, type Transport, type TransportFailure, type TransportRequest } from "@abth/core";

import { createDiskPictureStore } from "../electron/picture-disk-store";
import {
  createMemoryPictureStore,
  PICTURE_EPOCH,
  type PictureKey,
  type PictureStore,
} from "../src/hiroba-session";
import { CHART_PICTURE_MAX_BYTES, createChartPictureReader } from "../src/song-catalogue";
import { FFMPEG_JPEG, FFMPEG_LOSSY, gif, png } from "./picture-fixtures";

const FILE = "https://file.taiko.wiki/fumen/670/oni";
const WIKI = "https://cdn.wikiwiki.jp/to/w/taiko-fumen/%E3%81%82.png?rev=1&t=2";
const STAND_IN = "http://hiroba.test:8807";
const PNG = png(300, 20);
const keyOf = (url: string): PictureKey => ({
  scope: "shared",
  player: null,
  name: `${PICTURE_EPOCH}/chart/${url}`,
});

type Answer = Awaited<ReturnType<Transport["send"]>>;
type Responder = (request: TransportRequest) => Answer | Promise<Answer>;

const answer = (
  body: Uint8Array,
  url: string,
  status = 200,
  headers: Record<string, string> = {},
): Answer => ok({ status, url, headers, body });
const view = (format: string, bytes: Uint8Array, width: number, height: number) =>
  ok({
    src: `data:image/${format};base64,${btoa(String.fromCharCode(...bytes))}`,
    width,
    height,
  });
const padded = (bytes: Uint8Array, length: number) => {
  const whole = new Uint8Array(length);
  whole.set(bytes);
  return whole;
};

function recordingStore() {
  const inner = createMemoryPictureStore();
  const puts: Uint8Array[] = [];
  const store: PictureStore = {
    get: (key) => inner.get(key),
    put: async (key, bytes) => {
      puts.push(bytes);
      await inner.put(key, bytes);
    },
  };
  return { store, puts };
}

function setUp(options: { respond?: Responder; chartOrigin?: string; store?: PictureStore } = {}) {
  const sent: { request: TransportRequest; signal: AbortSignal | undefined }[] = [];
  const transport: Transport = {
    async send(request, signal) {
      sent.push({ request, signal });
      return (options.respond ?? ((asked) => answer(PNG, asked.url)))(request);
    },
  };
  const store = options.store ?? createMemoryPictureStore();
  const reader = createChartPictureReader({ transport, store, chartOrigin: options.chartOrigin });
  return { reader, sent, store };
}

describe("createChartPictureReader, a picture it reads", () => {
  test.each<[name: string, bytes: Uint8Array, format: string, width: number, height: number]>([
    ["a PNG", PNG, "png", 300, 20],
    ["a JPEG", FFMPEG_JPEG, "jpeg", 300, 20],
    ["a WebP", FFMPEG_LOSSY, "webp", 300, 20],
    ["a GIF", gif(18, 12), "gif", 18, 12],
  ])(
    "asks once for %s, with a bare GET under a timeout, and answers a data: URL",
    async (_name, bytes, format, width, height) => {
      const { reader, sent } = setUp({ respond: (asked) => answer(bytes, asked.url) });
      expect(await reader(FILE)).toEqual(view(format, bytes, width, height));
      expect(sent.map(({ request }) => request)).toEqual([{ method: "GET", url: FILE }]);
      expect(sent[0]?.signal?.aborted).toBe(false);
    },
  );

  test("goes by the bytes: no content type, or a wrong one, is no matter", async () => {
    for (const headers of [{}, { "content-type": "text/html" }, { "content-type": "image/png" }]) {
      const respond: Responder = (asked) => answer(FFMPEG_JPEG, asked.url, 200, headers);
      expect(await setUp({ respond }).reader(FILE)).toEqual(view("jpeg", FFMPEG_JPEG, 300, 20));
    }
  });

  test("takes a picture of the most bytes it allows, and refuses one byte more", async () => {
    const most = padded(PNG, CHART_PICTURE_MAX_BYTES);
    const taken = await setUp({ respond: (asked) => answer(most, asked.url) }).reader(FILE);
    expect(taken.ok && [taken.value.width, taken.value.height]).toEqual([300, 20]);
    const over = padded(PNG, CHART_PICTURE_MAX_BYTES + 1);
    const { reader } = setUp({ respond: (asked) => answer(over, asked.url) });
    expect(await reader(FILE)).toEqual(err({ code: "chart=tooLarge" }));
  });

  test("follows a redirect to another chart host", async () => {
    const { reader } = setUp({ respond: () => answer(PNG, WIKI) });
    expect(await reader(FILE)).toEqual(view("png", PNG, 300, 20));
  });

  test("reads the stand-in's origin as well when it is given one", async () => {
    const standIn = `${STAND_IN}/__charts/1001/oni-1.png`;
    const { reader, sent } = setUp({ chartOrigin: STAND_IN });
    expect((await reader(standIn)).ok).toBe(true);
    expect((await reader(FILE)).ok).toBe(true);
    expect(sent.map(({ request }) => request.url)).toEqual([standIn, FILE]);
  });
});

describe("createChartPictureReader, a picture it keeps", () => {
  test("answers later with no request, and after a relaunch too", async () => {
    const store = createMemoryPictureStore();
    const first = setUp({ store });
    const read = await first.reader(FILE);
    expect(read.ok).toBe(true);
    expect(await first.reader(FILE)).toEqual(read);
    expect(first.sent).toHaveLength(1);

    const relaunched = setUp({ store });
    expect(await relaunched.reader(FILE)).toEqual(read);
    expect(relaunched.sent).toHaveLength(0);
  });

  test("keeps each address apart", async () => {
    const store = createMemoryPictureStore();
    const bytesOf: Record<string, Uint8Array> = { [FILE]: PNG, [WIKI]: gif(18, 12) };
    const respond: Responder = (asked) => answer(bytesOf[asked.url] ?? PNG, asked.url);
    const first = setUp({ store, respond });
    const [file, wiki] = [await first.reader(FILE), await first.reader(WIKI)];
    expect(file).not.toEqual(wiki);

    const relaunched = setUp({ store });
    expect([await relaunched.reader(FILE), await relaunched.reader(WIKI)]).toEqual([file, wiki]);
    expect(relaunched.sent).toHaveLength(0);
  });

  test("keeps the exact bytes that passed, shared, under a name that holds the epoch", async () => {
    const { reader, store } = setUp({ respond: (asked) => answer(FFMPEG_JPEG, asked.url) });
    await reader(FILE);
    expect(await store.get(keyOf(FILE))).toEqual(FFMPEG_JPEG);
  });

  test("asks again for kept bytes that are no picture now, and keeps the new answer", async () => {
    const store = createMemoryPictureStore();
    for (const damaged of [new Uint8Array(40).fill(7), padded(PNG, CHART_PICTURE_MAX_BYTES + 1)]) {
      await store.put(keyOf(FILE), damaged);
      const { reader, sent } = setUp({ store });
      expect(await reader(FILE)).toEqual(view("png", PNG, 300, 20));
      expect(sent).toHaveLength(1);
      expect(await store.get(keyOf(FILE))).toEqual(PNG);
    }
  });

  test("asks once when two ask together", async () => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { reader, sent } = setUp({
      respond: async (asked) => {
        await held;
        return answer(PNG, asked.url);
      },
    });
    const together = Promise.all([reader(FILE), reader(FILE)]);
    release();
    const [first, second] = await together;
    expect(first).toEqual(view("png", PNG, 300, 20));
    expect(second).toEqual(first);
    expect(sent).toHaveLength(1);
  });
});

describe("createChartPictureReader, on the desktop's disk store", () => {
  const folders: string[] = [];
  afterEach(() => {
    for (const folder of folders.splice(0)) {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  test("answers a launch later with no request, whatever format the picture is", async () => {
    const folder = mkdtempSync(join(tmpdir(), "abth-charts-"));
    folders.push(folder);
    const first = setUp({
      store: createDiskPictureStore(folder),
      respond: (asked) => answer(FFMPEG_JPEG, asked.url),
    });
    const read = await first.reader(FILE);
    expect(read).toEqual(view("jpeg", FFMPEG_JPEG, 300, 20));

    const relaunched = setUp({ store: createDiskPictureStore(folder) });
    expect(await relaunched.reader(FILE)).toEqual(read);
    expect(relaunched.sent).toHaveLength(0);
  });
});

describe("createChartPictureReader, a picture it does not read", () => {
  test.each([
    ["not on a chart host", "https://evil.test/fumen/670/oni"],
    ["on the wiki's own host", "https://taiko.wiki/api/v1/song/all"],
    ["over http", "http://file.taiko.wiki/fumen/670/oni"],
    ["at a stand-in, when none is given", `${STAND_IN}/__charts/1001/oni-1.png`],
  ])(
    "answers notAllowed to an address %s, asking nothing and keeping nothing",
    async (_why, address) => {
      const { store, puts } = recordingStore();
      const { reader, sent } = setUp({ store });
      expect(await reader(address)).toEqual(err({ code: "chart=notAllowed" }));
      expect(sent).toEqual([]);
      expect(puts).toEqual([]);
    },
  );

  test("answers notAllowed to another origin than the stand-in's, when one is given", async () => {
    const { reader, sent } = setUp({ chartOrigin: STAND_IN });
    for (const address of ["http://hiroba.test:8808/a.png", "https://hiroba.test:8807/a.png"]) {
      expect(await reader(address)).toEqual(err({ code: "chart=notAllowed" }));
    }
    expect(sent).toEqual([]);
  });

  test("answers notAllowed to a redirect that ends off the chart hosts, and keeps nothing", async () => {
    const { store, puts } = recordingStore();
    for (const ended of ["https://evil.test/a.png", "http://file.taiko.wiki/a.png", "", "login"]) {
      const { reader } = setUp({ store, respond: () => answer(PNG, ended) });
      expect(await reader(FILE)).toEqual(err({ code: "chart=notAllowed" }));
    }
    expect(puts).toEqual([]);
  });

  test.each<[kind: TransportFailure["kind"], code: string]>([
    ["unreachable", "chart=unreachable"],
    ["timedOut", "chart=timedOut"],
    ["cancelled", "chart=timedOut"],
  ])("answers a request that ends %s as %s", async (kind, code) => {
    const { reader } = setUp({ respond: (asked) => err({ kind, url: asked.url }) });
    expect(await reader(FILE)).toEqual(err({ code }));
  });

  test.each([404, 410, 500, 304, 206])(
    "answers the status %d as chart=status-%d",
    async (status) => {
      const { reader } = setUp({ respond: (asked) => answer(PNG, asked.url, status) });
      expect(await reader(FILE)).toEqual(err({ code: `chart=status-${status}` }));
    },
  );

  test.each<[why: string, body: Uint8Array, code: string]>([
    ["a page", new TextEncoder().encode("<html>Not found</html>"), "chart=notPicture"],
    ["nothing", new Uint8Array(0), "chart=notPicture"],
    ["a PNG of no width", png(300, 20).fill(0, 16, 20), "chart=notPicture"],
    ["too many bytes", padded(PNG, CHART_PICTURE_MAX_BYTES + 1), "chart=tooLarge"],
  ])("answers %s as %s", async (_why, body, code) => {
    const { reader } = setUp({ respond: (asked) => answer(body, asked.url) });
    expect(await reader(FILE)).toEqual(err({ code }));
  });

  test("keeps nothing of what it refuses, and asks again the next time", async () => {
    const { store, puts } = recordingStore();
    const answers: Answer[] = [
      answer(new TextEncoder().encode("<html>"), FILE),
      answer(PNG, FILE, 404),
      err({ kind: "unreachable", url: FILE }),
    ];
    const respond: Responder = () => answers.shift() ?? answer(PNG, FILE);
    const { reader, sent } = setUp({ store, respond });
    expect((await reader(FILE)).ok).toBe(false);
    expect((await reader(FILE)).ok).toBe(false);
    expect((await reader(FILE)).ok).toBe(false);
    expect(puts).toEqual([]);
    expect((await reader(FILE)).ok).toBe(true);
    expect(sent).toHaveLength(4);
    expect(puts).toHaveLength(1);
  });

  test("names no host and no address in a failure", async () => {
    const failures = await Promise.all([
      setUp({ respond: (asked) => answer(PNG, asked.url, 404) }).reader(FILE),
      setUp({ respond: (asked) => err({ kind: "timedOut", url: asked.url }) }).reader(FILE),
      setUp({ respond: () => answer(PNG, "https://evil.test/a.png") }).reader(FILE),
      setUp().reader("https://evil.test/a.png"),
    ]);
    for (const failure of failures) {
      expect(!failure.ok && failure.error.code).toMatch(/^chart=[A-Za-z0-9-]+$/);
    }
  });
});
