/** Stand-in for Hiroba and the Bandai Namco ID host, so sign-in runs without the real sites. */
import { chineseNamesBatch } from "./mock-chinese-names";
import { createCostumeEditor, ERROR_SHELL_BODY, type MockSession } from "./mock-costume";
import { danLabelPng, NO_LABEL_GIF } from "./mock-dan-label";
import { createFavoritesEditor } from "./mock-favorites";
import {
  blankPlatePng,
  crownIconPng,
  medalPlatePng,
  myDonPng,
  rankIconPng,
  scorePanelPng,
  titlePlatePng,
} from "./mock-pictures";
import { createProfileEditor, escapeHtml } from "./mock-profile";
import { wikiSongsSince } from "./mock-song-catalogue";

const IP = process.env.ABTH_MOCK_IP ?? "127.0.0.1";
const HIROBA_HOST = `hiroba.${IP}.sslip.io`;
const IDP_HOST = `id.${IP}.sslip.io`;
/** The picture host's stand-in: on Hiroba's server and port, and outside its cookie's Domain. */
const IMG_HOST = `img.${IP}.sslip.io`;
const HIROBA_PORT = 8807;
const IDP_PORT = 8808;
const HIROBA = `http://${HIROBA_HOST}:${HIROBA_PORT}`;
const IDP = `http://${IDP_HOST}:${IDP_PORT}`;
// The OAuth hop is on a second ID host, as the real one: allowing only the form's host stops there.
const IDP_AUTH = `http://auth.${IDP_HOST}:${IDP_PORT}`;
const IMG = `http://${IMG_HOST}:${HIROBA_PORT}`;
const TAIKO_NO = "000000000000";

const sessions = new Map<string, MockSession>();
let lastIssued = "";
let rotateNext = false;
let holdIdForm = false;
let sendOffsite = false;
let postToLogin = false;
let redirectNextPost: { status: number; rotate: boolean } | null = null;
const POST_REDIRECT_STATUSES: readonly number[] = [301, 302, 303, 307, 308];
/** Set while /__hold-read?on=1 holds every read of my page unanswered; lets them all go. */
let releaseReads: (() => void) | null = null;
let readsHeld: Promise<void> = Promise.resolve();
const hits = new Map<string, number>();
/** The update feed the app may be pointed at: none until a check sets one. */
let updateFeed: { readonly status: number; readonly body: string } = { status: 404, body: "" };
const requestLog: string[] = [];
const costume = createCostumeEditor();
/** Shares the costume editor's token: one per session, each page read voiding the last. */
const profile = createProfileEditor({ issue: costume.issueTicket });
/** The favourite editors, and the favourites my page shows; the token is shared here too. */
const favorites = createFavoritesEditor({ issue: costume.issueTicket });
/** Marks what the ID host leaves behind (cookies, localStorage) so a test can find it on disk. */
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

// odd: a name with neither a count nor COMPLETE, a shape no page has shown.
type MedalState = "none" | "collecting" | "complete" | "odd";
let medalState: MedalState = "collecting";
const variant = {
  /** 0 for none, else the dan (1 to 15) whose label my page shows. */
  dan: 14,
  label: "png" as "png" | "gif",
  region: true,
  panel: "counts" as "counts" | "zeros",
};

const TITLES = {
  set: "サンプルの称号",
  other: "別のサンプル称号",
  third: "三つ目のサンプル称号",
  empty: "",
} as const;
let titlePlateAnswer: "png" | "blank" | "gif" = "png";
const titlePlates: { query: string; referer: string | null; session: boolean }[] = [];
let portraitAnswer: "png" | "gif" = "png";
const portraits: { query: string; referer: string | null; cookies: string[] }[] = [];
const PORTRAIT = `${IMG}/imgsrc.php?v=&kind=mydon&fn=mydon_${TAIKO_NO}`;

/** The picture host: public, as the live one is, so no cookie is looked at. */
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

interface PanelCounts {
  readonly ranks: readonly (readonly [rank: number, count: number])[];
  readonly crowns: readonly [silver: number, gold: number, donderful: number];
}
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
/** Common on real accounts: 虹極 at 0 in a block that is not, and a crown block that sums to 0. */
const PANEL_ZEROS: PanelCounts = {
  ranks: PANEL_COUNTS.ranks.map(([rank, count]) => [rank, rank === 8 ? 0 : count] as const),
  crowns: [0, 0, 0],
};

/** A plate id as my page writes one, 48 hex digits: here the hex of a base64 string. */
const plateIdOf = (seed: string) =>
  Array.from(btoa(seed), (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
const SEASONS = {
  1: { name: "どんメダル2026秋", id: plateIdOf("abth-mock-season-1") },
  2: { name: "どんメダル2026冬", id: plateIdOf("abth-mock-season-2") },
} as const;
let medalSeason: keyof typeof SEASONS = 1;
let tokenPlateAnswer: "png" | "gif" = "png";
const PANEL_LEVEL = 5;
let panelAnswer: "png" | "404" = "png";
const ICON_PATH = /^\/image\/sp\/640\/(?:best_score_rank_([2-8])|crown_0([1-4]))_640\.png$/;
let iconAnswer: "png" | "404" = "png";
const MEDAL_PROGRESS: Readonly<Record<MedalState, string>> = {
  none: "",
  collecting: `<div class="token_count token_info_display">12</div>`,
  complete: `<div class="token_complete token_info_display">\n\t\t\t\t\tCOMPLETE\n\t\t\t\t</div>`,
  odd: "",
};

function medalPlate(): string {
  if (medalState === "none") {
    return "";
  }
  const { name, id } = SEASONS[medalSeason];
  return `<div><img src="imgsrc_tokenplate.php?id=${id}" style="width: 100%;"><div class="token_name token_info_display">${name}</div>
    ${MEDAL_PROGRESS[medalState]}</div>`;
}

function myPage(ticket: string): string {
  const nickname = escapeHtml(profile.nickname());
  const worn = profile.title();
  const nameRow =
    variant.dan > 0
      ? `<div style="display:flex"><div>${nickname}</div><div><img src="imgsrc_danlabel.php?taiko_no=${TAIKO_NO}"></div></div>`
      : `<div style="height:24px;">${nickname}</div>`;
  const panel = variant.panel === "zeros" ? PANEL_ZEROS : PANEL_COUNTS;
  const [silver, gold, donderful] = panel.crowns;
  return `${profile.renameScript()}
<div class="mypage_menu"><input type="hidden" id="_tckt" name="_tckt" value="${ticket}" /></div>
<div id="mydon_area">
  <img src="imgsrc_titleplate.php" style="width: 100%;margin-bottom: -24px;position:relative;z-index:0;">
  <div>${worn === "" ? "\n\t\t" : escapeHtml(worn)}</div>
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
${favorites.myPageBlocks(ticket)}
${profile.renameDialog(ticket)}`;
}

async function ajaxEntry(
  request: Request,
  session: MockSession | undefined,
  record: (form: URLSearchParams) => void,
): Promise<{ form: URLSearchParams; session: MockSession } | Response> {
  if (request.method !== "POST") {
    return new Response("not found", { status: 404 });
  }
  const form = new URLSearchParams(await request.text());
  record(form);
  if (request.headers.get("x-requested-with") !== "XMLHttpRequest") {
    return page(ERROR_SHELL_BODY);
  }
  if (postToLogin || !session?.cardChosen) {
    return redirect("/login.php");
  }
  if (redirectNextPost !== null) {
    const { status, rotate } = redirectNextPost;
    redirectNextPost = null;
    return redirectedPost(status, rotate);
  }
  return { form, session };
}

function redirectedPost(status: number, rotate: boolean): Response {
  const headers: Record<string, string> = { location: "/mypage_top.php?again" };
  if (rotate) {
    sessions.clear();
    lastIssued = newToken();
    sessions.set(lastIssued, { cardChosen: true });
    headers["set-cookie"] =
      `_token_v2=${lastIssued}; Domain=.${HIROBA_HOST}; Path=/; Max-Age=2592000`;
  }
  return new Response(null, { status, headers });
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
    const icon = ICON_PATH.exec(pathname);
    if (icon !== null) {
      // Static art, as Hiroba's is: no session is asked for.
      const [, rank, crown] = icon;
      if (iconAnswer === "404") {
        return new Response("not found", { status: 404 });
      }
      const body = rank !== undefined ? rankIconPng(Number(rank)) : crownIconPng(Number(crown));
      return new Response(body, { headers: { "content-type": "image/png" } });
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
          // Hiroba has not been seen doing this; the stand-in rotates the token on a redirect hop
          // (the old one ends) so the transports are tested against it.
          rotateNext = false;
          sessions.clear();
          lastIssued = newToken();
          sessions.set(lastIssued, { cardChosen: true });
          return redirect("/mypage_top.php?rotated", {
            "set-cookie": `_token_v2=${lastIssued}; Domain=.${HIROBA_HOST}; Path=/; Max-Age=2592000`,
          });
        }
        await readsHeld;
        // My page carries forms (rename, 大好きな曲) with a token, so reading it issues a new one.
        return page(myPage(costume.issueTicket(session)));
      }
      case "/mypage_kisekae.php":
        if (!session?.cardChosen) {
          return redirect("/login.php");
        }
        return page(costume.page(session));
      case "/ajax/check_ip_kisekae.php":
      case "/ajax/change_mydon.php": {
        const entered = await ajaxEntry(request, session, (form) =>
          costume.record(pathname, request, form, session),
        );
        if (entered instanceof Response) {
          return entered;
        }
        if (pathname === "/ajax/check_ip_kisekae.php") {
          await costume.precheckLetThrough();
          return costume.precheck();
        }
        return costume.save(entered.session, entered.form, () => sessions.clear());
      }
      case "/mypage_title_edit.php":
        if (!session?.cardChosen) {
          return redirect("/login.php");
        }
        return page(profile.titlePage(session));
      case "/ajax/check_ip_title.php":
      case "/ajax/change_mydon_profile.php": {
        const entered = await ajaxEntry(request, session, (form) =>
          profile.record(pathname, request, form, session),
        );
        if (entered instanceof Response) {
          return entered;
        }
        if (pathname === "/ajax/check_ip_title.php") {
          await profile.precheckLetThrough();
          return profile.precheck();
        }
        await profile.saveLetThrough();
        return profile.save(entered.session, entered.form, () => sessions.clear());
      }
      case "/favorite_song_select.php":
        if (!session?.cardChosen) {
          return redirect("/login.php");
        }
        return page(favorites.folderPage(session, searchParams));
      case "/portal_favorite_song_select.php":
        if (!session?.cardChosen) {
          return redirect("/login.php");
        }
        return page(favorites.favoriteSongPage(session));
      case "/ajax/myfavorite_song.php":
      case "/ajax/mypage_song.php": {
        const entered = await ajaxEntry(request, session, (form) =>
          favorites.record(pathname, request, form, session),
        );
        if (entered instanceof Response) {
          return entered;
        }
        return pathname === "/ajax/myfavorite_song.php"
          ? favorites.saveFolder(entered.session, entered.form)
          : favorites.saveFavoriteSong(entered.session, entered.form);
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
          signedIn && titlePlateAnswer === "png" ? titlePlatePng(profile.title()) : blankPlatePng();
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
      case "/__update-feed": {
        const version = searchParams.get("version");
        updateFeed =
          version === null
            ? { status: Number(searchParams.get("status") ?? 404), body: "" }
            : {
                status: 200,
                body: JSON.stringify({
                  version,
                  notes: {
                    en: [`What is new in ${version}`, "Pictures load sooner"],
                    ja: ["新機能"],
                  },
                }),
              };
        return new Response("feed set");
      }
      case "/__update-feed/update.json":
        return new Response(updateFeed.body, {
          status: updateFeed.status,
          headers: { "content-type": "application/json" },
        });
      case "/__song-catalogue":
        return Response.json(wikiSongsSince(searchParams.get("after")));
      case "/__chinese-names":
        return Response.json(chineseNamesBatch(searchParams.get("gcmcontinue")));
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
      case "/__hold-read": {
        const on = searchParams.get("on");
        if (on === "1" && releaseReads === null) {
          readsHeld = new Promise((resolve) => {
            releaseReads = resolve;
          });
        } else if (on === "0") {
          releaseReads?.();
          releaseReads = null;
          readsHeld = Promise.resolve();
        }
        return new Response(releaseReads === null ? "flowing" : "holding");
      }
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
          profile.setTitle(TITLES[title]);
        }
        variant.region = flag("region", "set") ?? variant.region;
        const panel = searchParams.get("panel");
        if (panel === "counts" || panel === "zeros") {
          variant.panel = panel;
        }
        return Response.json({ ...variant, title: profile.title() });
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
      case "/__icons": {
        const answer = searchParams.get("answer");
        if (answer === "png" || answer === "404") {
          iconAnswer = answer;
        }
        return new Response(iconAnswer);
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
      case "/__post-redirect": {
        const status = Number(searchParams.get("status"));
        redirectNextPost = POST_REDIRECT_STATUSES.includes(status)
          ? { status, rotate: searchParams.get("rotate") === "1" }
          : null;
        return new Response(
          redirectNextPost === null
            ? "answering"
            : `${redirectNextPost.status}${redirectNextPost.rotate ? " rotating" : ""}`,
        );
      }
      default:
        return (
          costume.hook(pathname, searchParams) ??
          profile.hook(pathname, searchParams) ??
          favorites.hook(pathname, searchParams) ??
          new Response("not found", { status: 404 })
        );
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
