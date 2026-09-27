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
 * (requests so far to that path), /__hits-reset, and /__hold?on=1 or 0 (the ID form waits for a
 * tap instead of submitting itself, so a cancel or the back key can be tried there).
 *
 * Desktop, on loopback:
 *   bun scripts/mock-hiroba.ts
 *   ABTH_DEV_HIROBA_ORIGIN=http://hiroba.127.0.0.1.sslip.io:8807 \
 *   ABTH_DEV_IDP_HOST=id.127.0.0.1.sslip.io:8808 bun run dev
 *
 * The tablet, on this PC's LAN address (sslip.io resolves <name>.<ip>.sslip.io to <ip>):
 *   ABTH_MOCK_IP=<LAN IP> bun scripts/mock-hiroba.ts
 *   VITE_ABTH_DEV_HIROBA_ORIGIN=http://hiroba.<LAN IP>.sslip.io:8807 \
 *   VITE_ABTH_DEV_IDP_HOST=id.<LAN IP>.sslip.io:8808 \
 *   bun run android:live -- <adb serial> <LAN IP>
 */
const IP = process.env.ABTH_MOCK_IP ?? "127.0.0.1";
const HIROBA_HOST = `hiroba.${IP}.sslip.io`;
const IDP_HOST = `id.${IP}.sslip.io`;
const HIROBA_PORT = 8807;
const IDP_PORT = 8808;
const HIROBA = `http://${HIROBA_HOST}:${HIROBA_PORT}`;
const IDP = `http://${IDP_HOST}:${IDP_PORT}`;
const IDP_AUTH = `http://auth.${IDP_HOST}:${IDP_PORT}`;

const sessions = new Map<string, { cardChosen: boolean }>();
let lastIssued = "";
let rotateNext = false;
let holdIdForm = false;
const hits = new Map<string, number>();
/** Also searched for by scripts/e2e-desktop.ts. */
const IDP_MARKER = "abth-mock-idp-marker";
/** What Hiroba accepts, roughly: a string with all three of a real browser's product tokens. */
const COMPLETE_BROWSER = /AppleWebKit\/[\d.]+.*Chrome\/[\d.]+.*Safari\/[\d.]+/;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const newToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(26)), (b) => ALPHABET[b % 36]).join("");

function sessionOf(request: Request): { cardChosen: boolean } | undefined {
  const cookies = (request.headers.get("cookie") ?? "").split(/;\s*/);
  const token = cookies.find((c) => c.startsWith("_token_v2="))?.slice("_token_v2=".length);
  return token === undefined ? undefined : sessions.get(token);
}

function log(host: string, request: Request, note = "") {
  const { pathname } = new URL(request.url);
  const names = (request.headers.get("cookie") ?? "").split(/;\s*/).map((c) => c.split("=")[0]);
  console.log(`${host} ${request.method} ${pathname} cookies=[${names.join(",")}] ${note}`);
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

const MY_PAGE = `
<div id="mydon_area">
  <div>サンプルの称号</div>
  <div><div>サンプルどん</div><div></div></div>
  <div><div class="detail"><p>国・地域 ：サンプル</p><p>太鼓番：000000000000</p></div>
    <div class="mydon_image"><img class="customd_mydon" src="data:,"></div></div>
  <div class="total_score"><img src="image/sp/640/total_score_image_5.png">
    ${[8, 7, 6, 5, 4, 3, 2].map((r) => `<div class="best_rank_score_${r} total_panel_display">0</div>`).join("")}
    <div class="silver_crown_count total_panel_crown_display">11</div>
    <div class="gold_crown_count total_panel_crown_display">2</div>
    <div class="donderful_crown_count total_panel_crown_display">1</div></div>
</div>
<div class="favoriteSong"><h2 class="subtitleMypage">大好きな曲</h2><div class="mypageInfoArea">
  <ul id="songList"><li><div class="name"><span class="songName songNameFont">未設定</span></div></li></ul>
  <input type="hidden" name="song_no" id="song_no" value=""></div></div>
<div class="favoriteSong"><h2 class="subtitleMypage">お気に入りの曲</h2><div class="mypageInfoArea">
  <ul id="songList"></ul></div></div>`;

Bun.serve({
  hostname: IP,
  port: HIROBA_PORT,
  async fetch(request) {
    const { pathname, searchParams } = new URL(request.url);
    const session = sessionOf(request);
    log("hiroba", request);
    hits.set(pathname, (hits.get(pathname) ?? 0) + 1);
    if (
      !pathname.startsWith("/__") &&
      !COMPLETE_BROWSER.test(request.headers.get("user-agent") ?? "")
    ) {
      return RECOMMENDED_BROWSERS;
    }
    switch (pathname) {
      case "/login.php":
        return page(
          `<form id="login_form" action="./login_process.php"><input type="hidden" name="mode" value="exec"></form>${submitSoon("login_form")}`,
        );
      case "/login_process.php":
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
        return page(MY_PAGE);
      }
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
      case "/__cross-origin":
        return redirect(`${IDP}/__echo-cookie`);
      case "/__same-origin":
        return redirect("/__echo-cookie");
      case "/__echo-cookie":
        return Response.json({ cookieArrived: request.headers.has("cookie") });
      default:
        return new Response("not found", { status: 404 });
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
