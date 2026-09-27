/**
 * The one read, against a fake Transport. The page is a hand-written excerpt holding only what
 * parseProfilePage needs; no real account data (see packages/core/test/README.md).
 */
import { describe, expect, test } from "bun:test";
import { err, ok, type Transport, type TransportRequest } from "@abth/core";

import { readProfile } from "../src/hiroba-session";

const ENDPOINTS = { hirobaOrigin: "https://hiroba.test", idpHost: "id.test", idpDomain: "id.test" };
const NOW = () => new Date("2026-09-27T00:00:00.000Z");

const MY_PAGE_EXCERPT = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="mydon_area">
  <div>サンプルの称号</div>
  <div><div>サンプルどん</div><div></div></div>
  <div><div class="detail"><p>国・地域 ：サンプル</p><p>太鼓番：000000000000</p></div>
    <div class="mydon_image"><img class="customd_mydon" src="https://img.test/mydon.png"></div></div>
  <div class="total_score">
    <img src="image/sp/640/total_score_image_5.png">
    <div class="best_rank_score_8 total_panel_display">0</div>
    <div class="best_rank_score_7 total_panel_display">0</div>
    <div class="best_rank_score_6 total_panel_display">0</div>
    <div class="best_rank_score_5 total_panel_display">0</div>
    <div class="best_rank_score_4 total_panel_display">0</div>
    <div class="best_rank_score_3 total_panel_display">0</div>
    <div class="best_rank_score_2 total_panel_display">0</div>
    <div class="silver_crown_count total_panel_crown_display">11</div>
    <div class="gold_crown_count total_panel_crown_display">2</div>
    <div class="donderful_crown_count total_panel_crown_display">1</div>
  </div>
</div>
<div class="favoriteSong"><h2 class="subtitleMypage">大好きな曲</h2><div class="mypageInfoArea">
  <ul id="songList"><li><div class="name"><span class="songName songNameFont">未設定</span></div></li></ul>
  <input type="hidden" name="song_no" id="song_no" value=""></div></div>
<div class="favoriteSong"><h2 class="subtitleMypage">お気に入りの曲</h2><div class="mypageInfoArea">
  <ul id="songList"></ul></div></div>
</body></html>`;

const LOGIN_PAGE_EXCERPT = `<html><body><form id="login_form" action="./login_process.php"></form></body></html>`;

/** Answers every request with one fixed page and remembers what it was asked. */
function fakeTransport(
  finalUrl: string,
  html: string,
  requests: TransportRequest[] = [],
): Transport {
  return {
    async send(request) {
      requests.push(request);
      return ok({ status: 200, url: finalUrl, headers: {}, body: new TextEncoder().encode(html) });
    },
  };
}

describe("readProfile", () => {
  test("asks for my page once, with nothing but the method and the URL", async () => {
    const requests: TransportRequest[] = [];
    const transport = fakeTransport(
      "https://hiroba.test/mypage_top.php",
      MY_PAGE_EXCERPT,
      requests,
    );
    await readProfile(transport, ENDPOINTS, NOW);
    expect(requests).toEqual([{ method: "GET", url: "https://hiroba.test/mypage_top.php" }]);
  });

  test("keeps nickname, title, crowns and the read time", async () => {
    const transport = fakeTransport("https://hiroba.test/mypage_top.php", MY_PAGE_EXCERPT);
    expect(await readProfile(transport, ENDPOINTS, NOW)).toEqual(
      ok({
        nickname: "サンプルどん",
        title: "サンプルの称号",
        crowns: { silver: 11, gold: 2, donderful: 1 },
        fetchedAt: "2026-09-27T00:00:00.000Z",
      }),
    );
  });

  test("reads a redirect to the login page as a lost session, without parsing", async () => {
    const transport = fakeTransport("https://hiroba.test/login.php", LOGIN_PAGE_EXCERPT);
    expect(await readProfile(transport, ENDPOINTS, NOW)).toEqual(err({ kind: "loggedOut" }));
  });

  test("reads a login form served at my page's own URL as a lost session", async () => {
    const transport = fakeTransport("https://hiroba.test/mypage_top.php", LOGIN_PAGE_EXCERPT);
    expect(await readProfile(transport, ENDPOINTS, NOW)).toEqual(err({ kind: "loggedOut" }));
  });

  test("names an unfinished card select instead of an unreadable page", async () => {
    const transport = fakeTransport("https://hiroba.test/login_select.php", "<html></html>");
    expect(await readProfile(transport, ENDPOINTS, NOW)).toEqual(
      err({ kind: "cardSelectUnfinished" }),
    );
  });

  test("reports a page of another shape with codes for a report, not its text", async () => {
    const page = "<html><body><p>サンプルの本文 000000000000</p></body></html>";
    const transport = fakeTransport("https://hiroba.test/mypage_top.php?x=secret", page);
    const read = await readProfile(transport, ENDPOINTS, NOW);
    expect(read.ok).toBe(false);
    if (read.ok) return;
    expect(read.error.kind).toBe("unexpectedPage");
    const detail = read.error.detail ?? "";
    expect(detail).toStartWith("step=otherHiroba path=/mypage_top.php status=200 type=- bytes=");
    expect(detail).toMatch(/ parse=missingMarker@\S+$/);
    expect(detail).not.toContain("secret");
    expect(detail).not.toContain("サンプル");
    expect(detail).not.toContain("000000000000");
  });

  test("names where the read ended when it is not a Hiroba page it can read", async () => {
    const transport = fakeTransport("https://hiroba.test/index.php", "<html></html>");
    expect(await readProfile(transport, ENDPOINTS, NOW)).toEqual(
      err({
        kind: "unexpectedPage",
        detail: "step=landed path=/index.php status=200 type=- bytes=13",
      }),
    );
  });

  test("passes a transport failure on by kind", async () => {
    const transport: Transport = {
      send: async (request) => err({ kind: "timedOut", url: request.url }),
    };
    expect(await readProfile(transport, ENDPOINTS, NOW)).toEqual(err({ kind: "timedOut" }));
  });
});
