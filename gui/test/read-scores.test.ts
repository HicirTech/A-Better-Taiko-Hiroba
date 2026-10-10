import { describe, expect, test } from "bun:test";
import { ok, type Transport } from "@abth/core";

import type { MockSession } from "../scripts/mock-costume";
import { createPlayHistory } from "../scripts/mock-history";
import { createScorePages } from "../scripts/mock-scores";
import {
  createMemoryRecentPlaysStore,
  createMemoryScoresStore,
  createRecentPlaysReader,
  createScoresReader,
  SCORE_DETAIL_OPERATION,
  SCORE_LIST_OPERATION,
} from "../src/hiroba-session";
import {
  createPipeline,
  type EndedGroup,
  HISTORY_READ_CONSUMERS,
  IO_READ_CONSUMERS,
  SCORE_READ_CONSUMERS,
} from "../src/pipelines";

const ORIGIN = "https://hiroba.test";
const ENDPOINTS = {
  hirobaOrigin: ORIGIN,
  idpHost: "id.test",
  idpDomain: "id.test",
  imgOrigin: null,
};
const OWNER = "000000000000";
const TICKET = "t".repeat(32);
const ERROR_SHELL = "<h1>エラー</h1><table><tr><td>x</td></tr></table>";

const html = (url: string, body: string) =>
  ok({
    status: 200,
    url,
    headers: { "content-type": "text/html; charset=utf-8" },
    body: new TextEncoder().encode(`<html><body>${body}</body></html>`),
  });

/** Hiroba with `shown` plays, answering the history and score pages as the stand-in does. */
function hirobaWith(shown: number) {
  const history = createPlayHistory();
  const scores = createScorePages(history);
  history.control(new URLSearchParams({ shown: String(shown) }));
  const transport: Transport = {
    async send(request) {
      const url = new URL(request.url);
      const number = (name: string) => Number(url.searchParams.get(name) ?? "1");
      switch (url.pathname) {
        case "/history_recent_score.php":
          return html(request.url, (await history.page(number("page"))) ?? ERROR_SHELL);
        case "/score_list.php":
          return html(request.url, scores.list(number("genre"), TICKET));
        default: {
          const detail = scores.detail(url.searchParams.get("song_no") ?? "", number("level"));
          return html(request.url, detail ?? ERROR_SHELL);
        }
      }
    },
  };
  /** Plays at the arcade, then Hiroba's ↻ takes them in. */
  const play = (params: Record<string, string>) => {
    history.control(new URLSearchParams(params));
    const session: MockSession = { cardChosen: true, ticket: TICKET };
    history.refresh(session, new URLSearchParams({ _tckt: TICKET }), "");
  };
  const detailsAsked = (forget = false) =>
    (scores.control(new URLSearchParams(forget ? { forget: "1" } : {})) as { asked: string[] })
      .asked;
  return { history, scores, transport, play, detailsAsked };
}

function readersOver(transport: Transport) {
  const ended: { readonly pipeline: string; readonly group: EndedGroup }[] = [];
  const pipeline = (name: string, readConsumers: number) =>
    createPipeline({
      readConsumers,
      transport,
      ended: (group) => ended.push({ pipeline: name, group }),
    });
  let sessionEnds = 0;
  const endSession = () => {
    sessionEnds += 1;
  };
  const recentPlays = createRecentPlaysReader({
    endpoints: ENDPOINTS,
    pipeline: pipeline("history", HISTORY_READ_CONSUMERS),
    store: createMemoryRecentPlaysStore(),
    owner: () => OWNER,
    endSession,
    walked: (taikoNo, reading) => scores.noteWalk(taikoNo, reading),
  });
  const scores = createScoresReader({
    endpoints: ENDPOINTS,
    io: pipeline("io", IO_READ_CONSUMERS),
    pipeline: pipeline("scores", SCORE_READ_CONSUMERS),
    store: createMemoryScoresStore(),
    owner: () => OWNER,
    endSession,
    walk: recentPlays.readRecentPlays,
    walkProgress: recentPlays.recentPlaysProgress,
  });
  const groups = (name: string, operation: string) =>
    ended
      .filter((one) => one.pipeline === name && one.group.operation === operation)
      .map((one) => one.group.subject ?? "")
      .sort();
  return { recentPlays, scores, groups, sessionEnds: () => sessionEnds };
}

const sorted = (values: readonly string[]) => [...values].sort();

describe("createScoresReader", () => {
  test("a first read takes every list in Hiroba's IO pipeline, then each played chart's details", async () => {
    const hiroba = hirobaWith(12);
    const { scores, groups } = readersOver(hiroba.transport);

    const read = await scores.readScores();

    expect(read.ok && read.value.scores).toHaveLength(12);
    expect(read.ok && read.value.unread).toBe(0);
    expect(groups("io", SCORE_LIST_OPERATION)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    expect(groups("scores", SCORE_DETAIL_OPERATION)).toHaveLength(12);
    expect(sorted(hiroba.detailsAsked())).toEqual(groups("scores", SCORE_DETAIL_OPERATION));
  });

  test("a later read details only the charts recent plays show were played since", async () => {
    const hiroba = hirobaWith(12);
    const { scores, groups } = readersOver(hiroba.transport);
    await scores.readScores();
    hiroba.detailsAsked(true);

    hiroba.play({ replay: "3", play: "1" });
    const read = await scores.readScores();

    expect(sorted(hiroba.detailsAsked())).toEqual(["1003/4", "1013/4"]);
    expect(read.ok && read.value.detailed).toBe(2);
    expect(groups("io", SCORE_LIST_OPERATION)).toHaveLength(8);
    const replayed = read.ok ? read.value.scores.find((score) => score.songNo === "1003") : null;
    expect(replayed?.record.highScore).toBe(801003);
  });

  test("a read with nothing played since details nothing, and says it detailed none", async () => {
    const hiroba = hirobaWith(12);
    const { scores } = readersOver(hiroba.transport);
    await scores.readScores();
    hiroba.detailsAsked(true);

    const read = await scores.readScores();

    expect(read.ok && read.value.detailed).toBe(0);
    expect(read.ok && read.value.scores).toHaveLength(12);
    expect(hiroba.detailsAsked()).toEqual([]);
  });

  test("a title no list carries yet reads its genre's list again, then that chart", async () => {
    const hiroba = hirobaWith(12);
    const { scores, groups } = readersOver(hiroba.transport);
    await scores.readScores();
    hiroba.detailsAsked(true);

    hiroba.play({ play: "5" });
    await scores.readScores();

    // Songs 13 to 16 were listed unplayed; song 17 is new, in genre 2.
    expect(sorted(hiroba.detailsAsked())).toEqual([
      "1013/4",
      "1014/5",
      "1015/1",
      "1016/2",
      "1017/3",
    ]);
    expect(groups("io", SCORE_LIST_OPERATION)).toEqual([
      "1",
      "2",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ]);
  });

  test("a walk on the recent plays page marks its charts for the next read of scores", async () => {
    const hiroba = hirobaWith(12);
    const { recentPlays, scores } = readersOver(hiroba.transport);
    await scores.readScores();
    hiroba.detailsAsked(true);

    hiroba.play({ replay: "7" });
    await recentPlays.readRecentPlays();
    await scores.readScores();

    expect(hiroba.detailsAsked()).toEqual(["1007/3"]);
  });

  test("a read that stops at a chart keeps what it read and names the chart; the next goes on", async () => {
    const hiroba = hirobaWith(12);
    const { scores } = readersOver(hiroba.transport);
    hiroba.scores.control(new URLSearchParams({ fail: "1009/5" }));

    const stopped = await scores.readScores();

    expect(stopped.ok ? null : stopped.error).toEqual({
      kind: "siteError",
      at: { kind: "detail", songNo: "1009", songTitle: "サンプル曲 9", level: 5 },
    });
    const kept = await scores.scores();
    expect(kept.scores.length + kept.unread).toBe(12);
    const before = hiroba.detailsAsked();
    hiroba.detailsAsked(true);

    hiroba.scores.control(new URLSearchParams({ fail: "" }));
    const read = await scores.readScores();

    expect(read.ok && read.value.scores).toHaveLength(12);
    expect(hiroba.detailsAsked()).toHaveLength(12 - before.length + 1);
  });

  test("a read of one song details each chart its lists name", async () => {
    const hiroba = hirobaWith(12);
    const { scores } = readersOver(hiroba.transport);
    await scores.readScores();
    hiroba.detailsAsked(true);

    await scores.readSongScores("1004");

    expect(sorted(hiroba.detailsAsked())).toEqual([
      "1004/1",
      "1004/2",
      "1004/3",
      "1004/4",
      "1004/5",
    ]);
  });

  test("shows the walk's page while it runs, and nothing once the read ended", async () => {
    const hiroba = hirobaWith(12);
    const { scores } = readersOver(hiroba.transport);
    hiroba.history.control(new URLSearchParams({ hold: "1" }));

    const reading = scores.readScores();
    await Bun.sleep(1);
    const during = await scores.scoresProgress();
    hiroba.history.control(new URLSearchParams({ hold: "0" }));
    await reading;

    expect(during).toEqual({ step: "recentPlays", page: 1 });
    expect(await scores.scoresProgress()).toBeNull();
  });
});
