import { describe, expect, test } from "bun:test";
import { ok, type Transport } from "@abth/core";

import { createPlayHistory } from "../scripts/mock-history";
import {
  createMemoryRecentPlaysStore,
  createRecentPlaysReader,
  RECENT_PLAYS_PAGE_OPERATION,
} from "../src/hiroba-session";
import { createPipeline, type EndedGroup, HISTORY_READ_CONSUMERS } from "../src/pipelines";

const ORIGIN = "https://hiroba.test";
const ENDPOINTS = {
  hirobaOrigin: ORIGIN,
  idpHost: "id.test",
  idpDomain: "id.test",
  imgOrigin: null,
};
const OWNER = "000000000000";

const html = (url: string, body: string) =>
  ok({
    status: 200,
    url,
    headers: { "content-type": "text/html; charset=utf-8" },
    body: new TextEncoder().encode(`<html><body>${body}</body></html>`),
  });

/** Hiroba with `shown` plays in its history, answering each page as the stand-in does. */
function hirobaWith(shown: number, options: { failing?: number; signedOut?: boolean } = {}) {
  const history = createPlayHistory();
  history.control(
    new URLSearchParams({ shown: String(shown), fail: String(options.failing ?? 0) }),
  );
  const transport: Transport = {
    async send(request) {
      if (options.signedOut === true) {
        return html(`${ORIGIN}/login.php`, '<form id="login_form"></form>');
      }
      const page = Number(new URL(request.url).searchParams.get("page") ?? "1");
      const rows = await history.page(page);
      return html(request.url, rows ?? "<h1>エラー</h1><table><tr><td>x</td></tr></table>");
    },
  };
  return { history, transport };
}

function readerOver(transport: Transport) {
  const ended: EndedGroup[] = [];
  const store = createMemoryRecentPlaysStore();
  let sessionEnds = 0;
  const reader = createRecentPlaysReader({
    endpoints: ENDPOINTS,
    pipeline: createPipeline({
      readConsumers: HISTORY_READ_CONSUMERS,
      transport,
      ended: (group) => ended.push(group),
    }),
    store,
    owner: () => OWNER,
    endSession: () => {
      sessionEnds += 1;
    },
  });
  return { reader, store, ended, sessionEnds: () => sessionEnds };
}

const asked = (history: ReturnType<typeof createPlayHistory>) =>
  (history.control(new URLSearchParams()) as { asked: number[] }).asked;

describe("createRecentPlaysReader", () => {
  test("reads each page as a group of the play history pipeline, named by its page", async () => {
    const { history, transport } = hirobaWith(12);
    const { reader, store, ended } = readerOver(transport);

    const read = await reader.readRecentPlays();

    expect(read.ok && read.value.plays.map((play) => play.songTitle)).toEqual(
      Array.from({ length: 12 }, (_, index) => `サンプル曲 ${12 - index}`),
    );
    expect(await store.load(OWNER)).toHaveLength(12);
    expect(asked(history).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(ended.map((group) => [group.operation, group.subject]).sort()).toEqual(
      ["1", "2", "3", "4", "5"].map((page) => [RECENT_PLAYS_PAGE_OPERATION, page]),
    );
  });

  test("ends a walk at the page that failed, asks it once and keeps nothing", async () => {
    const { history, transport } = hirobaWith(20, { failing: 2 });
    const { reader, store } = readerOver(transport);

    const read = await reader.readRecentPlays();

    expect(read).toEqual({ ok: false, error: { kind: "siteError", page: 2 } });
    expect(asked(history).filter((page) => page === 2)).toEqual([2]);
    expect(await store.load(OWNER)).toEqual([]);
  });

  test("ends the session when a page finds it over", async () => {
    const { transport } = hirobaWith(5, { signedOut: true });
    const { reader, sessionEnds } = readerOver(transport);

    const read = await reader.readRecentPlays();

    expect(read).toEqual({ ok: false, error: { kind: "loggedOut", page: 1 } });
    expect(sessionEnds()).toBe(1);
  });

  test("tells the newest page asked while a walk runs, and nothing once it ended", async () => {
    const { history, transport } = hirobaWith(12);
    const { reader } = readerOver(transport);
    history.control(new URLSearchParams({ hold: "1" }));

    const walking = reader.readRecentPlays();
    await Bun.sleep(1);
    const during = await reader.recentPlaysProgress();
    history.control(new URLSearchParams({ hold: "0" }));
    await walking;

    expect(during).toBe(1);
    expect(await reader.recentPlaysProgress()).toBeNull();
  });
});
