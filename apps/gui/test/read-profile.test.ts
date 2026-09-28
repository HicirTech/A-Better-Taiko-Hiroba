/**
 * The one read, against a fake Transport. The page is a hand-written excerpt holding only what
 * parseProfilePage needs; no real account data (see packages/core/test/README.md). The dan label is
 * the mock's, drawn from core's templates.
 */
import { describe, expect, test } from "bun:test";
import { err, ok, type Transport, type TransportRequest } from "@abth/core";
import { encode } from "fast-png";

import { danLabelPng, NO_LABEL_GIF } from "../scripts/mock-dan-label";
import { readOwnProfile, readProfile } from "../src/hiroba-session";
import { pngDataUrl } from "../src/hiroba-session/png-answer";

const ENDPOINTS = {
  hirobaOrigin: "https://hiroba.test",
  idpHost: "id.test",
  idpDomain: "id.test",
  imgOrigin: "https://img.test",
};
const NOW = () => new Date("2026-09-27T00:00:00.000Z");
const MY_PAGE_URL = "https://hiroba.test/mypage_top.php";
const LABEL_URL = "https://hiroba.test/imgsrc_danlabel.php?taiko_no=000000000000";
/** The どんメダル plate's id, a placeholder in the form my page writes: 48 hex digits. */
const MEDAL_PLATE_ID = "0123456789abcdef0123456789abcdef0123456789abcdef";

const MY_PAGE_EXCERPT = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="mydon_area">
  <img src="imgsrc_titleplate.php" style="width: 100%;">
  <div>サンプルの称号</div>
  <div><div>サンプルどん</div><div><img src="imgsrc_danlabel.php?taiko_no=000000000000"></div></div>
  <div><div class="detail"><p>国・地域 ：サンプル</p><p>太鼓番：000000000000</p></div>
    <div class="mydon_image"><img class="customd_mydon" src="https://img.test/imgsrc.php?v=&kind=mydon&fn=mydon_000000000000"></div></div>
  <div class="total_score">
    <img src="image/sp/640/total_score_image_5.png">
    <div class="best_rank_score_8 total_panel_display">7</div>
    <div class="best_rank_score_7 total_panel_display">6</div>
    <div class="best_rank_score_6 total_panel_display">5</div>
    <div class="best_rank_score_5 total_panel_display">4</div>
    <div class="best_rank_score_4 total_panel_display">3</div>
    <div class="best_rank_score_3 total_panel_display">2</div>
    <div class="best_rank_score_2 total_panel_display">1</div>
    <div class="silver_crown_count total_panel_crown_display">11</div>
    <div class="gold_crown_count total_panel_crown_display">2</div>
    <div class="donderful_crown_count total_panel_crown_display">1</div>
  </div>
  <div><img src="imgsrc_tokenplate.php?id=${MEDAL_PLATE_ID}" style="width: 100%;">
    <div class="token_name token_info_display">どんメダル2026秋</div>
    <div class="token_complete token_info_display">COMPLETE</div></div>
</div>
<div class="favoriteSong"><h2 class="subtitleMypage">大好きな曲</h2><div class="mypageInfoArea">
  <ul id="songList"><li><div class="name"><span class="songName songNameFont">未設定</span></div></li></ul>
  <input type="hidden" name="song_no" id="song_no" value=""></div></div>
<div class="favoriteSong"><h2 class="subtitleMypage">お気に入りの曲</h2><div class="mypageInfoArea">
  <ul id="songList"><li><span class="songName">サンプル曲</span></li></ul></div></div>
</body></html>`;

/** The name row as a dan-less my page writes it: one flat div, no label. */
const DAN_LESS_EXCERPT = MY_PAGE_EXCERPT.replace(
  '<div><div>サンプルどん</div><div><img src="imgsrc_danlabel.php?taiko_no=000000000000"></div></div>',
  '<div style="height:24px;">サンプルどん</div>',
);

const LOGIN_PAGE_EXCERPT = `<html><body><form id="login_form" action="./login_process.php"></form></body></html>`;

type Answer = Awaited<ReturnType<Transport["send"]>>;

/** A page answered at 200, ending at `url`. */
const page = (url: string, html: string): Answer =>
  ok({ status: 200, url, headers: {}, body: new TextEncoder().encode(html) });

/** The label request's answer: bytes of a content type, at a status. */
const labelAnswer = (type: string, body: Uint8Array, status = 200, url = LABEL_URL): Answer =>
  ok({ status, url, headers: { "content-type": type }, body });

/** The mock's 九段 label, as Hiroba serves a label. */
const NINTH_DAN = labelAnswer("image/png", danLabelPng(14));
/** The picture a label crosses as: its own bytes, and its size. */
const labelPicture = (bytes: Uint8Array, width = 96, height = 40) => ({
  src: pngDataUrl(bytes),
  width,
  height,
});
/** A view as JSON with every picture's bytes left out: base64 could hold any short string. */
const withoutPictureBytes = (json: string) => json.replace(/data:[^"]*/g, "data:");

/**
 * Answers the dan label's path with `label` and every other request with `myPage`, and remembers
 * what it was asked.
 */
function fakeTransport(
  myPage: Answer,
  label: Answer = NINTH_DAN,
  requests: TransportRequest[] = [],
): Transport {
  return {
    async send(request) {
      requests.push(request);
      return new URL(request.url).pathname === "/imgsrc_danlabel.php" ? label : myPage;
    },
  };
}

/** A PNG of any size, all transparent. */
function blankPng(width: number, height: number): Uint8Array {
  return new Uint8Array(
    encode({ width, height, data: new Uint8Array(width * height * 4), channels: 4 }),
  );
}

describe("readProfile", () => {
  test("asks for my page, then the dan label it shows, with nothing but the method and the URL", async () => {
    const requests: TransportRequest[] = [];
    await readProfile(
      fakeTransport(page(MY_PAGE_URL, MY_PAGE_EXCERPT), NINTH_DAN, requests),
      ENDPOINTS,
      NOW,
    );
    expect(requests).toEqual([
      { method: "GET", url: MY_PAGE_URL },
      { method: "GET", url: LABEL_URL },
    ]);
  });

  test("carries identity, the dan, the panel, the medal and favourites to the view", async () => {
    const transport = fakeTransport(page(MY_PAGE_URL, MY_PAGE_EXCERPT));
    expect(await readProfile(transport, ENDPOINTS, NOW)).toEqual(
      ok({
        nickname: "サンプルどん",
        title: "サンプルの称号",
        region: "サンプル",
        dan: { name: "九段", picture: labelPicture(danLabelPng(14)) },
        crowns: { silver: 11, gold: 2, donderful: 1 },
        panel: { countLevel: 5, ranks: { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7 } },
        medal: { name: "どんメダル2026秋", progress: { kind: "complete" } },
        favoriteSong: null,
        favoriteFolder: ["サンプル曲"],
        fetchedAt: "2026-09-27T00:00:00.000Z",
      }),
    );
  });

  test("carries a set 大好きな曲 to the view as its title alone", async () => {
    const set = MY_PAGE_EXCERPT.replace(
      '<span class="songName songNameFont">未設定</span>',
      '<span class="songName songNameFontnamco">サンプル曲アルファ</span>',
    ).replace('id="song_no" value=""', 'id="song_no" value="1346"');
    expect(set).toContain("サンプル曲アルファ");
    expect(set).toContain('value="1346"');
    const read = await readProfile(fakeTransport(page(MY_PAGE_URL, set)), ENDPOINTS, NOW);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.value.favoriteSong).toBe("サンプル曲アルファ");
    expect(read.value.favoriteFolder).toEqual(["サンプル曲"]);
    expect(JSON.stringify(read.value)).not.toContain("1346");
  });

  test("lets neither the taiko number nor any URL through to the view, dan read or not", async () => {
    expect(MY_PAGE_EXCERPT).toContain("taiko_no=000000000000");
    for (const label of [NINTH_DAN, labelAnswer("image/gif", NO_LABEL_GIF)]) {
      const transport = fakeTransport(page(MY_PAGE_URL, MY_PAGE_EXCERPT), label);
      const view = withoutPictureBytes(
        JSON.stringify(await readProfile(transport, ENDPOINTS, NOW)),
      );
      expect(view).not.toContain("000000000000");
      expect(view).not.toContain("imgsrc");
      expect(view).not.toContain("taiko");
      expect(view).not.toContain("http");
    }
  });

  test("hands the platform the taiko number and the pictures' sources beside the view", async () => {
    const own = await readOwnProfile(
      fakeTransport(page(MY_PAGE_URL, MY_PAGE_EXCERPT)),
      ENDPOINTS,
      NOW,
    );
    const view = await readProfile(
      fakeTransport(page(MY_PAGE_URL, MY_PAGE_EXCERPT)),
      ENDPOINTS,
      NOW,
    );
    if (!own.ok || !view.ok) {
      throw new Error("expected both reads to succeed");
    }
    expect(own.value.taikoNo).toBe("000000000000");
    expect(own.value.pictures).toEqual({
      titlePlate: { form: "bare", title: "サンプルの称号" },
      medalPlate: { id: MEDAL_PLATE_ID, progress: "complete" },
      myDon: { v: "" },
    });
    expect(own.value.view).toEqual(view.value);
    const shown = withoutPictureBytes(JSON.stringify(own.value.view));
    expect(shown).not.toContain("000000000000");
    expect(shown).not.toContain("titleplate");
    expect(shown).not.toContain("tokenplate");
    expect(shown).not.toContain(MEDAL_PLATE_ID);
    expect(shown).not.toContain("mydon");
    expect(shown).not.toContain("img.test");
  });

  test("reads a redirect to the login page as a lost session, without parsing or a label", async () => {
    const requests: TransportRequest[] = [];
    const transport = fakeTransport(
      page("https://hiroba.test/login.php", LOGIN_PAGE_EXCERPT),
      NINTH_DAN,
      requests,
    );
    expect(await readProfile(transport, ENDPOINTS, NOW)).toEqual(err({ kind: "loggedOut" }));
    expect(requests).toHaveLength(1);
  });

  test("reads a login form served at my page's own URL as a lost session", async () => {
    const transport = fakeTransport(page(MY_PAGE_URL, LOGIN_PAGE_EXCERPT));
    expect(await readProfile(transport, ENDPOINTS, NOW)).toEqual(err({ kind: "loggedOut" }));
  });

  test("names an unfinished card select instead of an unreadable page", async () => {
    const transport = fakeTransport(page("https://hiroba.test/login_select.php", "<html></html>"));
    expect(await readProfile(transport, ENDPOINTS, NOW)).toEqual(
      err({ kind: "cardSelectUnfinished" }),
    );
  });

  test("reports a page of another shape with codes for a report, not its text", async () => {
    const other = "<html><body><p>サンプルの本文 000000000000</p></body></html>";
    const transport = fakeTransport(page("https://hiroba.test/mypage_top.php?x=secret", other));
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
    const transport = fakeTransport(page("https://hiroba.test/index.php", "<html></html>"));
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

describe("readProfile's dan label", () => {
  /** The dan a read of my page carries, whatever `label` the label request is answered with. */
  async function danAfter(label: Answer, html = MY_PAGE_EXCERPT) {
    const requests: TransportRequest[] = [];
    const read = await readProfile(
      fakeTransport(page(MY_PAGE_URL, html), label, requests),
      ENDPOINTS,
      NOW,
    );
    if (!read.ok) {
      throw new Error(`the profile failed: ${JSON.stringify(read.error)}`);
    }
    return { dan: read.value.dan, requests: requests.length };
  }

  test("a dan-less my page asks for no label and carries no dan", async () => {
    expect(await danAfter(NINTH_DAN, DAN_LESS_EXCERPT)).toEqual({ dan: null, requests: 1 });
  });

  test("a label that never arrives leaves the profile standing, with the failure's kind", async () => {
    const lost = err({ kind: "timedOut" as const, url: LABEL_URL });
    expect(await danAfter(lost)).toEqual({
      dan: { unreadable: true, code: "dan=timedOut", picture: null },
      requests: 2,
    });
  });

  test("Hiroba's 43-byte GIF at 200, its answer when it has nothing to draw, is no dan", async () => {
    expect((await danAfter(labelAnswer("image/gif", NO_LABEL_GIF))).dan).toEqual({
      unreadable: true,
      code: "dan=notPng status=200 type=image/gif bytes=43",
      picture: null,
    });
  });

  test("decides by the type and the bytes, whatever the status", async () => {
    const at404 = labelAnswer("image/png", danLabelPng(14), 404);
    expect((await danAfter(at404)).dan).toEqual({
      name: "九段",
      picture: labelPicture(danLabelPng(14)),
    });
  });

  test("a PNG of another size is not a label, and says what size it was", async () => {
    const small = blankPng(10, 10);
    expect((await danAfter(labelAnswer("image/png", small))).dan).toEqual({
      unreadable: true,
      code: `dan=notAnImage size=10x10 status=200 type=image/png bytes=${small.byteLength}`,
      picture: labelPicture(small, 10, 10),
    });
  });

  test("a blank label, whose glyph matches no dan, is unreadable rather than guessed", async () => {
    const blank = blankPng(96, 40);
    expect((await danAfter(labelAnswer("image/png; charset=binary", blank))).dan).toEqual({
      unreadable: true,
      code: `dan=unreadableGlyph status=200 type=image/png; charset=binary bytes=${blank.byteLength}`,
      picture: labelPicture(blank),
    });
  });

  test("an answer far larger than a label is refused before it is decoded", async () => {
    const huge = new Uint8Array(64 * 1024 + 1);
    expect((await danAfter(labelAnswer("image/png", huge))).dan).toEqual({
      unreadable: true,
      code: "dan=tooLarge status=200 type=image/png bytes=65537",
      picture: null,
    });
  });

  test("an answer that ended on another page names its path, never the query", async () => {
    const login = labelAnswer(
      "text/html; charset=UTF-8",
      new TextEncoder().encode(LOGIN_PAGE_EXCERPT),
      200,
      "https://hiroba.test/login.php?redirect=secret",
    );
    const { dan } = await danAfter(login);
    expect(dan).toEqual({
      unreadable: true,
      code: `dan=notPng path=/login.php status=200 type=text/html; charset=UTF-8 bytes=${LOGIN_PAGE_EXCERPT.length}`,
      picture: null,
    });
  });

  test("the label's picture is the very bytes its dan was read off, at no request more", async () => {
    const { dan, requests } = await danAfter(NINTH_DAN);
    expect(requests).toBe(2);
    expect(dan?.picture?.src).toBe(pngDataUrl(danLabelPng(14)));
  });

  test("a label that answered from another address is read, but not shown", async () => {
    const moved = labelAnswer(
      "image/png",
      danLabelPng(14),
      200,
      "https://hiroba.test/elsewhere.php?taiko_no=000000000000",
    );
    expect((await danAfter(moved)).dan).toEqual({ name: "九段", picture: null });
  });

  test("a label source that leads off Hiroba is not asked for", async () => {
    const offsite = MY_PAGE_EXCERPT.replace(
      'src="imgsrc_danlabel.php?',
      'src="https://elsewhere.test/imgsrc_danlabel.php?',
    );
    expect(offsite).toContain("elsewhere.test");
    expect(await danAfter(NINTH_DAN, offsite)).toEqual({
      dan: { unreadable: true, code: "dan=unexpectedSrc", picture: null },
      requests: 1,
    });
  });
});
