/**
 * A local stand-in for Hiroba and the Bandai Namco ID host, for running the whole sign-in without
 * the real sites. Its pages submit themselves, so nothing has to click. It issues a fake 26-char
 * `_token_v2` as a Domain cookie (not HttpOnly, 30 days), like Hiroba, and logs cookie names only.
 *
 * Like Hiroba, it answers a User-Agent that is not a complete browser string with a data-less
 * "recommended browsers" page. Like an ID provider, its ID host leaves cookies of its own (one
 * host-only, one Domain) and a localStorage entry behind, all marked with IDP_MARKER so a test can
 * look for them on disk. Like the real walk, it reaches the ID form through an OAuth hop on a
 * second ID host (auth.<ID host>, standing in for www.bandainamcoid.com), so a sign-in window that
 * allows only the form's host stops there, as the real one did on 2026-09-27.
 *
 * Test hooks: /__last-token (the token issued last), /__expire (every session ends), /__rotate
 * (the next my-page read hands out a new token and ends the old one), /__hits?path=/mypage_top.php
 * (requests so far to that path), /__hits-reset, /__hold?on=1 or 0 (the ID form waits for a
 * tap instead of submitting itself, so a cancel or the back key can be tried there),
 * /__offsite?on=1 or 0 (login_process.php redirects to a host on neither site), and two that shape
 * the next my page: /__medal?state=none|collecting|complete|odd&season=1|2 (the どんメダル plate:
 * absent, a count, COMPLETE, or a name alone, a shape no page has shown; each optional, and season
 * 2 is a new season, with a name and a plate id of its own) and
 * /__variant?dan=0|1…15&label=png|gif&title=empty|set|other|third&region=unset|set
 * &favorites=unset|set&panel=counts|zeros (each optional; dan=0 writes the name row flat, as other
 * players' dan-less profiles do, and dan=N shows the label of dan N, 14 (九段) at first; label=gif
 * answers the label with the 43-byte 1×1 GIF Hiroba sends when it has nothing to draw; title=other
 * and title=third wear a second and a third title; favorites=set sets the 大好きな曲 and fills the
 * お気に入り folder with three songs, two of them sharing a title; panel=zeros puts 虹極 at 0 and
 * every crown at 0).
 *
 * My page shows its title plate, imgsrc_titleplate.php with no query, as #mydon_area's first child,
 * as Hiroba's does. As on Hiroba, the plate is drawn for a session only: a PNG of its own for each
 * title (scripts/mock-pictures.ts), and without one a blank plate, a PNG as well, at 200. Its hooks:
 * /__titleplate?answer=png|blank|gif (what the plate answers from now on: as described, the blank
 * plate even with a session, or the 43-byte GIF) and /__titleplates (every plate asked for, in
 * order, as {query, referer, session}; ?reset=1 clears).
 *
 * The どんメダル plate is imgsrc_tokenplate.php?id= and the season's id, 48 hex digits as on Hiroba
 * (here the hex of a base64 string, no real id), public as Hiroba's is: drawn with or without a
 * session, one plate for each id and for each state it is shown in, collecting or complete, and the
 * 43-byte GIF for an id my page has not shown. /__tokenplate?answer=png|gif sets what it answers
 * from now on: as described, or the GIF for every id.
 *
 * The score panel's art is image/sp/640/total_score_image_5.png, the panel my page shows, a static
 * picture as on Hiroba: drawn with or without a session, 600×356 as the live one is, with the
 * spots my page writes its counts on left plain (scripts/mock-pictures.ts). /__panel?answer=png|404
 * sets what it answers from now on: the art, or Hiroba's 404 for a picture it does not have.
 *
 * The label, imgsrc_danlabel.php, is public as on Hiroba: it answers without a session. It is
 * drawn from core's label templates by scripts/mock-dan-label.ts, so the app's reader reads it.
 *
 * The My Don portrait comes from a picture host off Hiroba, as on the live page, which the same
 * server stands in for when it is asked by that host's name, img.<ip>.sslip.io:8807: outside the
 * session cookie's Domain, .hiroba.<ip>.sslip.io, so only the app itself keeps the cookie off it.
 * My page shows imgsrc.php?v=&kind=mydon&fn=mydon_ and the page's taiko number there, public as the
 * live one is: drawn with or without a session, from the set the costume editor saved last, so a
 * write changes it. Its hooks, on Hiroba's host: /__mydon?answer=png|gif (what the portrait answers
 * from now on) and /__mydons (every portrait asked for, in order, as {query, referer, cookies}, the
 * names of the cookies it carried; ?reset=1 clears).
 *
 * The costume editor, mypage_kisekae.php, its preview, imgsrc_mydon.php, its items' thumbnails,
 * imgsrc_kisekae.php (both pictures drawn for a session only, as Hiroba's are), and the two posts a
 * costume write sends, ajax/check_ip_kisekae.php and ajax/change_mydon.php, are
 * scripts/mock-costume.ts: stateful, with hooks of their own listed there. Like Hiroba, an ajax
 * post without X-Requested-With gets the site's error page at 200; one without a session is sent to
 * the login page. Two more hooks cover every request: /__log (each non-hook request so far, as
 * "METHOD /path"; /__log-reset clears it) and /__post-to-login?on=1 or 0 (every ajax post answers
 * with a redirect to the login page, the session left as it was).
 *
 * Desktop, on loopback:
 *   bun scripts/mock-hiroba.ts
 *   ABTH_DEV_HIROBA_ORIGIN=http://hiroba.127.0.0.1.sslip.io:8807 \
 *   ABTH_DEV_IDP_HOST=id.127.0.0.1.sslip.io:8808 \
 *   ABTH_DEV_IMG_ORIGIN=http://img.127.0.0.1.sslip.io:8807 bun run dev
 *
 * The tablet, on this PC's LAN address (sslip.io resolves <name>.<ip>.sslip.io to <ip>):
 *   ABTH_MOCK_IP=<LAN IP> bun scripts/mock-hiroba.ts
 *   VITE_ABTH_DEV_HIROBA_ORIGIN=http://hiroba.<LAN IP>.sslip.io:8807 \
 *   VITE_ABTH_DEV_IDP_HOST=id.<LAN IP>.sslip.io:8808 \
 *   VITE_ABTH_DEV_IMG_ORIGIN=http://img.<LAN IP>.sslip.io:8807 \
 *   bun run android:live -- <adb serial> <LAN IP>
 * The picture host's override is optional: without it, the app asks no picture host anything.
 */
import { createCostumeEditor, ERROR_SHELL_BODY, type MockSession } from "./mock-costume";
import { danLabelPng, NO_LABEL_GIF } from "./mock-dan-label";
import {
  blankPlatePng,
  medalPlatePng,
  myDonPng,
  scorePanelPng,
  titlePlatePng,
} from "./mock-pictures";

const IP = process.env.ABTH_MOCK_IP ?? "127.0.0.1";
const HIROBA_HOST = `hiroba.${IP}.sslip.io`;
const IDP_HOST = `id.${IP}.sslip.io`;
/** The picture host's stand-in: on Hiroba's server and port, and outside its cookie's Domain. */
const IMG_HOST = `img.${IP}.sslip.io`;
const HIROBA_PORT = 8807;
const IDP_PORT = 8808;
const HIROBA = `http://${HIROBA_HOST}:${HIROBA_PORT}`;
const IDP = `http://${IDP_HOST}:${IDP_PORT}`;
const IDP_AUTH = `http://auth.${IDP_HOST}:${IDP_PORT}`;
const IMG = `http://${IMG_HOST}:${HIROBA_PORT}`;
/** The mock player's taiko number: a placeholder, no real card's. */
const TAIKO_NO = "000000000000";

const sessions = new Map<string, MockSession>();
let lastIssued = "";
let rotateNext = false;
let holdIdForm = false;
let sendOffsite = false;
let postToLogin = false;
const hits = new Map<string, number>();
/** Every request that is not a hook, in order, as "METHOD /path". */
const requestLog: string[] = [];
const costume = createCostumeEditor();
/** Also searched for by scripts/e2e-desktop.ts. */
const IDP_MARKER = "abth-mock-idp-marker";
/** What Hiroba accepts, roughly: a string with all three of a real browser's product tokens. */
const COMPLETE_BROWSER = /AppleWebKit\/[\d.]+.*Chrome\/[\d.]+.*Safari\/[\d.]+/;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const newToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(26)), (b) => ALPHABET[b % 36]).join("");

function sessionOf(request: Request): MockSession | undefined {
  const cookies = (request.headers.get("cookie") ?? "").split(/;\s*/);
  const token = cookies.find((c) => c.startsWith("_token_v2="))?.slice("_token_v2=".length);
  return token === undefined ? undefined : sessions.get(token);
}

/** The names of the cookies `request` carried, never their values. */
function cookieNamesOf(request: Request): string[] {
  const header = request.headers.get("cookie") ?? "";
  return header === "" ? [] : header.split(/;\s*/).map((c) => c.split("=")[0] ?? "");
}

function log(host: string, request: Request, note = "") {
  const { pathname } = new URL(request.url);
  console.log(
    `${host} ${request.method} ${pathname} cookies=[${cookieNamesOf(request).join(",")}] ${note}`,
  );
}

const page = (body: string) =>
  new Response(
    `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`,
    {
      headers: { "content-type": "text/html; charset=utf-8" },
    },
  );
const redirect = (location: string, headers: Record<string, string> = {}) =>
  new Response(null, { status: 302, headers: { location, ...headers } });
const RECOMMENDED_BROWSERS = page("<p>Please use one of the recommended browsers.</p>");
const submitSoon = (id: string) =>
  `<script>setTimeout(() => document.getElementById("${id}").submit(), 500)</script>`;

type MedalState = "none" | "collecting" | "complete" | "odd";
/** What /__medal and /__variant set; every read of my page is rendered from them. */
let medalState: MedalState = "collecting";
const variant = {
  /** 0 for no dan, or the dan, 1 to 15, whose label my page shows. */
  dan: 14,
  label: "png" as "png" | "gif",
  title: "set" as "set" | "other" | "third" | "empty",
  region: true,
  favorites: false,
  /** The panel's counts: PANEL_COUNTS, or PANEL_ZEROS. */
  panel: "counts" as "counts" | "zeros",
};

/** The title my page shows in each title variant; each is a plate of its own. */
const TITLES = {
  set: "サンプルの称号",
  other: "別のサンプル称号",
  third: "三つ目のサンプル称号",
  empty: "",
} as const;
/** What the title plate answers, as /__titleplate last set it. */
let titlePlateAnswer: "png" | "blank" | "gif" = "png";
/** A title plate as it was asked for: its query, the page the request named, and a session. */
const titlePlates: { query: string; referer: string | null; session: boolean }[] = [];
/** What the My Don portrait answers, as /__mydon last set it. */
let portraitAnswer: "png" | "gif" = "png";
/** A portrait as it was asked for: its query, the page the request named, and its cookies' names. */
const portraits: { query: string; referer: string | null; cookies: string[] }[] = [];
/** Where my page shows the player's portrait: on the picture host, by the page's taiko number. */
const PORTRAIT = `${IMG}/imgsrc.php?v=&kind=mydon&fn=mydon_${TAIKO_NO}`;

/**
 * The picture host: the mock player's My Don portrait, drawn from the set saved last, and nothing
 * else. Public, as the live one is: a session changes nothing, and no cookie is looked at.
 */
function pictureHost(request: Request): Response {
  const { pathname, search, searchParams } = new URL(request.url);
  if (pathname !== "/imgsrc.php") {
    return new Response("not found", { status: 404 });
  }
  portraits.push({
    query: search,
    referer: request.headers.get("referer"),
    cookies: cookieNamesOf(request),
  });
  if (searchParams.get("kind") !== "mydon" || searchParams.get("fn") !== `mydon_${TAIKO_NO}`) {
    return new Response("not found", { status: 404 });
  }
  if (portraitAnswer === "gif") {
    return new Response(NO_LABEL_GIF, { headers: { "content-type": "image/gif" } });
  }
  return new Response(myDonPng(costume.saved()), { headers: { "content-type": "image/png" } });
}

/** The panel's counts: each score rank's, 8 down to 2, and each crown's, silver, gold, donderful. */
interface PanelCounts {
  readonly ranks: readonly (readonly [rank: number, count: number])[];
  readonly crowns: readonly [silver: number, gold: number, donderful: number];
}
/** Every count non-zero, so each part of each bar has a length. */
const PANEL_COUNTS: PanelCounts = {
  ranks: [
    [8, 3],
    [7, 12],
    [6, 25],
    [5, 31],
    [4, 18],
    [3, 9],
    [2, 4],
  ],
  crowns: [11, 2, 1],
};
/**
 * Counts of 0, common on real accounts: 虹極 at 0 in a block that is not, and a crown block that
 * sums to 0.
 */
const PANEL_ZEROS: PanelCounts = {
  ranks: PANEL_COUNTS.ranks.map(([rank, count]) => [rank, rank === 8 ? 0 : count] as const),
  crowns: [0, 0, 0],
};

/** A plate id as my page writes one, 48 hex digits: here the hex of a base64 string. */
const plateIdOf = (seed: string) =>
  Array.from(btoa(seed), (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
/** Each season's plate, its name and its id: placeholders, not a real account's. */
const SEASONS = {
  1: { name: "どんメダル2026秋", id: plateIdOf("abth-mock-season-1") },
  2: { name: "どんメダル2026冬", id: plateIdOf("abth-mock-season-2") },
} as const;
let medalSeason: keyof typeof SEASONS = 1;
/** What the plate's picture answers, as /__tokenplate last set it. */
let tokenPlateAnswer: "png" | "gif" = "png";
/** The level of the one score panel my page shows, and what its art answers, as /__panel set it. */
const PANEL_LEVEL = 5;
let panelAnswer: "png" | "404" = "png";
/** What follows the plate's name in each state; the count is a placeholder. */
const MEDAL_PROGRESS: Readonly<Record<MedalState, string>> = {
  none: "",
  collecting: `<div class="token_count token_info_display">12</div>`,
  complete: `<div class="token_complete token_info_display">\n\t\t\t\t\tCOMPLETE\n\t\t\t\t</div>`,
  odd: "",
};

/** The plate as /__medal last shaped it, in the season it last set, or nothing for none. */
function medalPlate(): string {
  if (medalState === "none") {
    return "";
  }
  const { name, id } = SEASONS[medalSeason];
  return `<div><img src="imgsrc_tokenplate.php?id=${id}" style="width: 100%;"><div class="token_name token_info_display">${name}</div>
    ${MEDAL_PROGRESS[medalState]}</div>`;
}

/** My page as /__medal and /__variant last shaped it. */
function myPage(): string {
  const nameRow =
    variant.dan > 0
      ? `<div style="display:flex"><div>サンプルどん</div><div><img src="imgsrc_danlabel.php?taiko_no=${TAIKO_NO}"></div></div>`
      : `<div style="height:24px;">サンプルどん</div>`;
  const song = variant.favorites
    ? `<span class="songName songNameFontnamco">サンプル曲アルファ</span>`
    : `<span class="songName songNameFont">未設定</span>`;
  // Two of the three share a title, as ten catalogue titles are carried by more than one song.
  const folder = variant.favorites
    ? ["サンプル曲ベータ", "サンプル曲ガンマ", "サンプル曲ベータ"]
        .map((title) => `<li><span class="songName songNameFontnamco">${title}</span></li>`)
        .join("")
    : "";
  const panel = variant.panel === "zeros" ? PANEL_ZEROS : PANEL_COUNTS;
  const [silver, gold, donderful] = panel.crowns;
  return `
<div id="mydon_area">
  <img src="imgsrc_titleplate.php" style="width: 100%;margin-bottom: -24px;position:relative;z-index:0;">
  <div>${variant.title === "empty" ? "\n\t\t" : TITLES[variant.title]}</div>
  ${nameRow}
  <div><div class="detail"><p>国・地域 ：${variant.region ? "サンプル" : "未設定"}</p><p>太鼓番：${TAIKO_NO}</p></div>
    <div class="mydon_image"><img class="customd_mydon" src="${PORTRAIT}"></div></div>
  <div class="total_score"><img src="image/sp/640/total_score_image_${PANEL_LEVEL}.png">
    ${panel.ranks.map(([rank, count]) => `<div class="best_rank_score_${rank} total_panel_display">${count}</div>`).join("")}
    <div class="silver_crown_count total_panel_crown_display">${silver}</div>
    <div class="gold_crown_count total_panel_crown_display">${gold}</div>
    <div class="donderful_crown_count total_panel_crown_display">${donderful}</div></div>
  ${medalPlate()}
</div>
<div class="favoriteSong"><h2 class="subtitleMypage">大好きな曲</h2><div class="mypageInfoArea">
  <ul id="songList"><li><div class="name">${song}</div></li></ul>
  <input type="hidden" name="song_no" id="song_no" value="${variant.favorites ? "1346" : ""}"></div></div>
<div class="favoriteSong"><h2 class="subtitleMypage">お気に入りの曲</h2><div class="mypageInfoArea">
  <ul id="songList">${folder}</ul></div></div>`;
}

Bun.serve({
  hostname: IP,
  port: HIROBA_PORT,
  async fetch(request) {
    const { host, pathname, searchParams } = new URL(request.url);
    const session = sessionOf(request);
    const onPictureHost = host === `${IMG_HOST}:${HIROBA_PORT}`;
    log(onPictureHost ? "img" : "hiroba", request);
    hits.set(pathname, (hits.get(pathname) ?? 0) + 1);
    if (!pathname.startsWith("/__")) {
      requestLog.push(`${request.method} ${pathname}`);
    }
    if (
      !pathname.startsWith("/__") &&
      !COMPLETE_BROWSER.test(request.headers.get("user-agent") ?? "")
    ) {
      return RECOMMENDED_BROWSERS;
    }
    if (onPictureHost) {
      return pictureHost(request);
    }
    switch (pathname) {
      case "/login.php":
        return page(
          `<form id="login_form" action="./login_process.php"><input type="hidden" name="mode" value="exec"></form>${submitSoon("login_form")}`,
        );
      case "/login_process.php":
        if (sendOffsite) {
          return redirect(`http://offsite.${IP}.sslip.io:${IDP_PORT}/login.html`);
        }
        return redirect(
          `${IDP_AUTH}/v2/oauth2/auth?redirect_uri=${encodeURIComponent(`${HIROBA}/callback.php`)}`,
        );
      case "/callback.php": {
        lastIssued = newToken();
        sessions.set(lastIssued, { cardChosen: false });
        return redirect("/login_select.php", {
          "set-cookie": `_token_v2=${lastIssued}; Domain=.${HIROBA_HOST}; Path=/; Max-Age=2592000`,
        });
      }
      case "/login_select.php":
        if (session === undefined) {
          return redirect("/login.php");
        }
        if (request.method === "POST") {
          session.cardChosen = true;
          return redirect("/index.php");
        }
        return page(
          `<form id="form_user1" method="post" action="login_select.php"><input type="hidden" name="id_pos" value="1"></form>${submitSoon("form_user1")}`,
        );
      case "/index.php":
        return session?.cardChosen ? page("<h1>signed in</h1>") : redirect("/login.php");
      case "/mypage_top.php": {
        if (!session?.cardChosen) {
          return redirect("/login.php");
        }
        if (rotateNext && !searchParams.has("rotated")) {
          // Hiroba has not been seen doing this; the stand-in does it so the transports are
          // tested against it: a new token on a redirect hop, and the old one no longer valid.
          rotateNext = false;
          sessions.clear();
          lastIssued = newToken();
          sessions.set(lastIssued, { cardChosen: true });
          return redirect("/mypage_top.php?rotated", {
            "set-cookie": `_token_v2=${lastIssued}; Domain=.${HIROBA_HOST}; Path=/; Max-Age=2592000`,
          });
        }
        // My page carries forms (rename, 大好きな曲) with a token, so reading it issues a new one.
        costume.issueTicket(session);
        return page(myPage());
      }
      case "/mypage_kisekae.php":
        if (!session?.cardChosen) {
          return redirect("/login.php");
        }
        return page(costume.page(session));
      case "/ajax/check_ip_kisekae.php":
      case "/ajax/change_mydon.php": {
        if (request.method !== "POST") {
          return new Response("not found", { status: 404 });
        }
        const form = new URLSearchParams(await request.text());
        costume.record(pathname, request, form, session);
        if (request.headers.get("x-requested-with") !== "XMLHttpRequest") {
          return page(ERROR_SHELL_BODY);
        }
        if (postToLogin || !session?.cardChosen) {
          return redirect("/login.php");
        }
        if (pathname === "/ajax/check_ip_kisekae.php") {
          await costume.precheckLetThrough();
          return costume.precheck();
        }
        return costume.save(session, form, () => sessions.clear());
      }
      case "/imgsrc_mydon.php":
        return costume.preview(new URL(request.url).search, session?.cardChosen === true);
      case "/imgsrc_kisekae.php":
        return costume.thumbnail(
          searchParams,
          session?.cardChosen === true,
          request.headers.get("referer"),
        );
      case "/imgsrc_titleplate.php": {
        // Drawn for the session: whoever holds it, wearing what my page shows now.
        const signedIn = session?.cardChosen === true;
        titlePlates.push({
          query: new URL(request.url).search,
          referer: request.headers.get("referer"),
          session: signedIn,
        });
        if (titlePlateAnswer === "gif") {
          return new Response(NO_LABEL_GIF, { headers: { "content-type": "image/gif" } });
        }
        const plate =
          signedIn && titlePlateAnswer === "png"
            ? titlePlatePng(TITLES[variant.title])
            : blankPlatePng();
        return new Response(plate, { headers: { "content-type": "image/png" } });
      }
      case "/imgsrc_tokenplate.php": {
        // Public, as Hiroba's is: the id picks the plate, and no session is asked for.
        const id = searchParams.get("id") ?? "";
        const shown = Object.values(SEASONS).some((season) => season.id === id);
        if (!shown || tokenPlateAnswer === "gif") {
          return new Response(NO_LABEL_GIF, { headers: { "content-type": "image/gif" } });
        }
        return new Response(medalPlatePng(id, medalState === "complete"), {
          headers: { "content-type": "image/png" },
        });
      }
      case `/image/sp/640/total_score_image_${PANEL_LEVEL}.png`:
        // A static picture, as Hiroba's is: no session is asked for.
        if (panelAnswer === "404") {
          return new Response("not found", { status: 404 });
        }
        return new Response(scorePanelPng(PANEL_LEVEL), {
          headers: { "content-type": "image/png" },
        });
      case "/imgsrc_danlabel.php":
        // Public, as Hiroba's is: the query picks whose label, and no session is asked for.
        if (variant.dan === 0 || variant.label === "gif" || !searchParams.has("taiko_no")) {
          return new Response(NO_LABEL_GIF, { headers: { "content-type": "image/gif" } });
        }
        return new Response(danLabelPng(variant.dan), { headers: { "content-type": "image/png" } });
      // Test hooks, loopback only.
      case "/__last-token":
        return new Response(lastIssued);
      case "/__expire":
        sessions.clear();
        return new Response("expired");
      case "/__rotate":
        rotateNext = true;
        return new Response("rotating");
      case "/__hits":
        return new Response(String(hits.get(searchParams.get("path") ?? "") ?? 0));
      case "/__hits-reset":
        hits.clear();
        return new Response("reset");
      case "/__hold":
        holdIdForm = searchParams.get("on") === "1";
        return new Response(holdIdForm ? "holding" : "flowing");
      case "/__offsite":
        sendOffsite = searchParams.get("on") === "1";
        return new Response(sendOffsite ? "offsite" : "onsite");
      case "/__medal": {
        const state = searchParams.get("state");
        if (state === "none" || state === "collecting" || state === "complete" || state === "odd") {
          medalState = state;
        }
        const season = searchParams.get("season");
        if (season === "1" || season === "2") {
          medalSeason = season === "1" ? 1 : 2;
        }
        return new Response(`${medalState} ${medalSeason}`);
      }
      case "/__variant": {
        const flag = (name: string, on: string) =>
          searchParams.has(name) ? searchParams.get(name) === on : undefined;
        const dan = searchParams.get("dan") ?? "";
        if (/^\d+$/.test(dan) && Number(dan) <= 15) {
          variant.dan = Number(dan);
        }
        const label = searchParams.get("label");
        if (label === "png" || label === "gif") {
          variant.label = label;
        }
        const title = searchParams.get("title");
        if (title === "set" || title === "other" || title === "third" || title === "empty") {
          variant.title = title;
        }
        variant.region = flag("region", "set") ?? variant.region;
        variant.favorites = flag("favorites", "set") ?? variant.favorites;
        const panel = searchParams.get("panel");
        if (panel === "counts" || panel === "zeros") {
          variant.panel = panel;
        }
        return Response.json(variant);
      }
      case "/__titleplate": {
        const answer = searchParams.get("answer");
        if (answer === "png" || answer === "blank" || answer === "gif") {
          titlePlateAnswer = answer;
        }
        return new Response(titlePlateAnswer);
      }
      case "/__tokenplate": {
        const answer = searchParams.get("answer");
        if (answer === "png" || answer === "gif") {
          tokenPlateAnswer = answer;
        }
        return new Response(tokenPlateAnswer);
      }
      case "/__panel": {
        const answer = searchParams.get("answer");
        if (answer === "png" || answer === "404") {
          panelAnswer = answer;
        }
        return new Response(panelAnswer);
      }
      case "/__titleplates":
        if (searchParams.get("reset") === "1") {
          titlePlates.length = 0;
        }
        return Response.json(titlePlates);
      case "/__mydon": {
        const answer = searchParams.get("answer");
        if (answer === "png" || answer === "gif") {
          portraitAnswer = answer;
        }
        return new Response(portraitAnswer);
      }
      case "/__mydons":
        if (searchParams.get("reset") === "1") {
          portraits.length = 0;
        }
        return Response.json(portraits);
      case "/__cross-origin":
        return redirect(`${IDP}/__echo-cookie`);
      case "/__same-origin":
        return redirect("/__echo-cookie");
      case "/__echo-cookie":
        return Response.json({ cookieArrived: request.headers.has("cookie") });
      case "/__log":
        return Response.json(requestLog);
      case "/__log-reset":
        requestLog.length = 0;
        return new Response("reset");
      case "/__post-to-login":
        postToLogin = searchParams.get("on") === "1";
        return new Response(postToLogin ? "to login" : "answering");
      default:
        return costume.hook(pathname, searchParams) ?? new Response("not found", { status: 404 });
    }
  },
});

Bun.serve({
  hostname: IP,
  port: IDP_PORT,
  async fetch(request) {
    const url = new URL(request.url);
    log("idp", request);
    switch (url.pathname) {
      case "/v2/oauth2/auth":
        return redirect(
          `${IDP}/login.html?redirect_uri=${encodeURIComponent(url.searchParams.get("redirect_uri") ?? "")}`,
        );
      case "/login.html":
        return page(
          `<form id="f" method="post" action="/login"><input name="back" type="hidden" value="${url.searchParams.get("redirect_uri") ?? ""}"></form><button form="f">Sign in</button><script>localStorage.setItem("abth_mock_idp", "${IDP_MARKER}-storage")</script>${holdIdForm ? "" : submitSoon("f")}`,
        );
      case "/login": {
        const back = String((await request.formData()).get("back") ?? "");
        const response = redirect(`/passkeyInfo.html?back=${encodeURIComponent(back)}`);
        response.headers.append(
          "set-cookie",
          `idp_host_only=${IDP_MARKER}-host; Path=/; Max-Age=2592000`,
        );
        response.headers.append(
          "set-cookie",
          `idp_domain=${IDP_MARKER}-domain; Domain=.${IDP_HOST}; Path=/; Max-Age=2592000`,
        );
        return response;
      }
      case "/passkeyInfo.html":
        return page(
          `<form id="later" action="/later"><input name="back" type="hidden" value="${url.searchParams.get("back") ?? ""}"></form>${submitSoon("later")}`,
        );
      case "/later":
        return redirect(`${url.searchParams.get("back")}?code=mock`);
      case "/__echo-cookie":
        return Response.json({ cookieArrived: request.headers.has("cookie") });
      default:
        return new Response("not found", { status: 404 });
    }
  },
});

console.log(`mock Hiroba ${HIROBA}\nmock ID host ${IDP}`);
