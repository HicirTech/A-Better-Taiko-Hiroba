/**
 * The desktop transport against a stand-in for fetch: which hop gets the cookie, how redirects and
 * a new session cookie are taken up, how a form is posted, and what the caller gets back.
 */
import { describe, expect, test } from "bun:test";

import { createHirobaTransport, type SessionCookieHolder } from "../electron/hiroba-transport";

const UA =
  "Mozilla/5.0 (test) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";
const ORIGIN = "https://hiroba.test";
const NOW = Date.parse("2026-09-27T00:00:00Z");

interface Sent {
  readonly url: string;
  readonly method: string | undefined;
  readonly headers: Record<string, string>;
  readonly body: unknown;
}

function setUp(answers: Response[], cookie: string | null = "sample-session") {
  const sent: Sent[] = [];
  const session: SessionCookieHolder & { value: string | null } = {
    value: cookie,
    get() {
      return this.value;
    },
    set(value) {
      this.value = value;
    },
  };
  const transport = createHirobaTransport({
    session,
    userAgent: UA,
    hirobaOrigin: ORIGIN,
    now: () => NOW,
    fetch: async (url, init) => {
      sent.push({
        url,
        method: init.method,
        headers: init.headers as Record<string, string>,
        body: init.body,
      });
      const answer = answers.shift();
      if (answer === undefined) {
        throw new Error("no answer left");
      }
      return answer;
    },
  });
  return { sent, session, transport };
}

const page = (body = "<p>page</p>", headers: [string, string][] = []) =>
  new Response(body, { headers: [["content-type", "text/html; charset=utf-8"], ...headers] });
const redirect = (location: string, headers: [string, string][] = [], status = 302) =>
  new Response(null, { status, headers: [["location", location], ...headers] });
const FORM_TYPE = "application/x-www-form-urlencoded; charset=UTF-8";
/** A post as a write sends one: a token first, then the fields, in the page's order. */
const post = (url: string, headers: Record<string, string> = {}) =>
  ({
    method: "POST",
    url,
    headers,
    form: [
      ["_tckt", "sample-ticket"],
      ["color_face", "3"],
      ["note", "a b&c=~"],
    ],
  }) as const;

describe("createHirobaTransport", () => {
  test("adds the session and the browser identity, and drops a caller's own", async () => {
    const { sent, transport } = setUp([page()]);
    await transport.send({
      method: "GET",
      url: `${ORIGIN}/mypage_top.php`,
      headers: { cookie: "x=1", "USER-AGENT": "curl", "X-Requested-With": "XMLHttpRequest" },
    });
    expect(sent[0]?.headers).toEqual({
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": UA,
      Cookie: "_token_v2=sample-session",
    });
  });

  test("sends no Cookie header while signed out", async () => {
    const { sent, transport } = setUp([page()], null);
    await transport.send({ method: "GET", url: `${ORIGIN}/mypage_top.php` });
    expect(sent[0]?.headers).toEqual({ "User-Agent": UA });
  });

  test("keeps the session off every other origin, redirect hops included", async () => {
    const { sent, transport } = setUp([
      redirect("https://id.test/login.html"),
      redirect("http://hiroba.test/plain"),
      page(),
    ]);
    const sentBack = await transport.send({ method: "GET", url: `${ORIGIN}/login_process.php` });
    expect(sent.map((s) => [s.url, s.headers.Cookie])).toEqual([
      [`${ORIGIN}/login_process.php`, "_token_v2=sample-session"],
      ["https://id.test/login.html", undefined],
      ["http://hiroba.test/plain", undefined],
    ]);
    expect(sentBack.ok && sentBack.value.url).toBe("http://hiroba.test/plain");
  });

  test("sends the picture host no cookie: not the session, not one it set itself", async () => {
    const PORTRAIT = "https://img.test/imgsrc.php?v=&kind=mydon&fn=mydon_000000000000";
    const png = (headers: [string, string][] = []) =>
      new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
        headers: [["content-type", "image/png"], ...headers],
      });
    const { sent, session, transport } = setUp([
      png([["set-cookie", "_token_v2=from-the-picture-host; Path=/"]]),
      redirect(PORTRAIT),
      png(),
    ]);
    await transport.send({ method: "GET", url: PORTRAIT });
    // Asked of Hiroba and sent on to the picture host, as a redirect might.
    await transport.send({ method: "GET", url: `${ORIGIN}/imgsrc.php` });
    expect(sent.map((s) => [s.url, s.headers.Cookie])).toEqual([
      [PORTRAIT, undefined],
      [`${ORIGIN}/imgsrc.php`, "_token_v2=sample-session"],
      [PORTRAIT, undefined],
    ]);
    expect(session.value).toBe("sample-session");
  });

  test("follows redirects to the final page and never hands set-cookie back", async () => {
    const { transport } = setUp([
      redirect("/login.php", [["set-cookie", "other=1; Path=/"]]),
      page("<form id=login_form></form>", [["set-cookie", "_ga=1"]]),
    ]);
    const sentBack = await transport.send({ method: "GET", url: `${ORIGIN}/mypage_top.php` });
    expect(sentBack.ok && sentBack.value.url).toBe(`${ORIGIN}/login.php`);
    expect(sentBack.ok && sentBack.value.status).toBe(200);
    expect(sentBack.ok && sentBack.value.headers).toEqual({
      "content-type": "text/html; charset=utf-8",
    });
    expect(sentBack.ok && new TextDecoder().decode(sentBack.value.body)).toBe(
      "<form id=login_form></form>",
    );
  });

  test("takes up a new session cookie Hiroba sets, from the next hop on", async () => {
    const { sent, session, transport } = setUp([
      redirect("/mypage_top.php?again", [
        ["set-cookie", "_token_v2=rotated-session; Domain=.hiroba.test; Path=/; Max-Age=2592000"],
      ]),
      page(),
    ]);
    await transport.send({ method: "GET", url: `${ORIGIN}/mypage_top.php` });
    expect(sent.map((s) => s.headers.Cookie)).toEqual([
      "_token_v2=sample-session",
      "_token_v2=rotated-session",
    ]);
    expect(session.value).toBe("rotated-session");
  });

  test("ends the session when Hiroba expires it, and ignores one set by another host", async () => {
    const expired = setUp([page("", [["set-cookie", "_token_v2=; Max-Age=0; Path=/"]])]);
    await expired.transport.send({ method: "GET", url: `${ORIGIN}/logout.php` });
    expect(expired.session.value).toBeNull();

    const past = setUp([
      page("", [["set-cookie", "_token_v2=x; Expires=Wed, 31 Dec 2000 23:59:59 GMT"]]),
    ]);
    await past.transport.send({ method: "GET", url: `${ORIGIN}/logout.php` });
    expect(past.session.value).toBeNull();

    const elsewhere = setUp([page("", [["set-cookie", "_token_v2=planted; Path=/"]])]);
    await elsewhere.transport.send({ method: "GET", url: "https://id.test/login.html" });
    expect(elsewhere.session.value).toBe("sample-session");

    const foreignDomain = setUp([page("", [["set-cookie", "_token_v2=planted; Domain=.id.test"]])]);
    await foreignDomain.transport.send({ method: "GET", url: `${ORIGIN}/` });
    expect(foreignDomain.session.value).toBe("sample-session");
  });

  test("gives up after 20 redirects, as unreachable", async () => {
    const { sent, transport } = setUp(Array.from({ length: 30 }, () => redirect("/loop")));
    const sentBack = await transport.send({ method: "GET", url: `${ORIGIN}/loop` });
    expect(sentBack).toEqual({ ok: false, error: { kind: "unreachable", url: `${ORIGIN}/loop` } });
    expect(sent).toHaveLength(21);
  });

  test("reports a failed or cancelled request by kind only", async () => {
    const { transport } = setUp([]);
    const unreachable = await transport.send({ method: "GET", url: `${ORIGIN}/` });
    expect(unreachable).toEqual({ ok: false, error: { kind: "unreachable", url: `${ORIGIN}/` } });

    const controller = new AbortController();
    controller.abort();
    const cancelled = await transport.send({ method: "GET", url: `${ORIGIN}/` }, controller.signal);
    expect(cancelled).toEqual({ ok: false, error: { kind: "cancelled", url: `${ORIGIN}/` } });
  });
});

describe("createHirobaTransport posting a form", () => {
  test("encodes the form in its order and sets the form's type, dropping a caller's", async () => {
    const { sent, transport } = setUp([page(`{"result":0}`)]);
    await transport.send(
      post(`${ORIGIN}/ajax/change_mydon.php`, {
        "content-type": "text/plain",
        "X-Requested-With": "XMLHttpRequest",
      }),
    );
    expect(sent).toEqual([
      {
        url: `${ORIGIN}/ajax/change_mydon.php`,
        method: "POST",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent": UA,
          "Content-Type": FORM_TYPE,
          Cookie: "_token_v2=sample-session",
        },
        body: "_tckt=sample-ticket&color_face=3&note=a+b%26c%3D%7E",
      },
    ]);
  });

  test("follows a 301, 302 or 303 after a post with one GET that carries no body", async () => {
    for (const status of [301, 302, 303]) {
      const { sent, transport } = setUp([redirect("/login.php", [], status), page()]);
      const sentBack = await transport.send(post(`${ORIGIN}/ajax/change_mydon.php`));
      expect(sent.map((s) => [s.method, s.url, s.headers["Content-Type"], s.body])).toEqual([
        ["POST", `${ORIGIN}/ajax/change_mydon.php`, FORM_TYPE, sent[0]?.body],
        ["GET", `${ORIGIN}/login.php`, undefined, undefined],
      ]);
      expect(sent[0]?.body).toBeString();
      expect(sentBack.ok && sentBack.value.url).toBe(`${ORIGIN}/login.php`);
    }
  });

  test("hands back a 307 or 308 after a post, and never sends the post again", async () => {
    for (const status of [307, 308]) {
      const { sent, transport } = setUp([redirect("/ajax/again.php", [], status), page()]);
      const sentBack = await transport.send(post(`${ORIGIN}/ajax/change_mydon.php`));
      expect(sent).toHaveLength(1);
      expect(sentBack.ok && sentBack.value.status).toBe(status);
      expect(sentBack.ok && sentBack.value.url).toBe(`${ORIGIN}/ajax/change_mydon.php`);
    }
  });

  test("follows a 307 after a GET as before", async () => {
    const { sent, transport } = setUp([redirect("/mypage_top.php?again", [], 307), page()]);
    await transport.send({ method: "GET", url: `${ORIGIN}/mypage_top.php` });
    expect(sent.map((s) => [s.method, s.url])).toEqual([
      ["GET", `${ORIGIN}/mypage_top.php`],
      ["GET", `${ORIGIN}/mypage_top.php?again`],
    ]);
  });

  test("keeps the session and the body off a hop to another origin", async () => {
    const { sent, transport } = setUp([redirect("https://id.test/landing"), page()]);
    await transport.send(post(`${ORIGIN}/ajax/change_mydon.php`));
    expect(sent[1]).toEqual({
      url: "https://id.test/landing",
      method: "GET",
      headers: { "User-Agent": UA },
      body: undefined,
    });
  });

  test("takes up a session cookie Hiroba sets on the post's own answer", async () => {
    const { session, transport } = setUp([
      page(`{"result":0}`, [["set-cookie", "_token_v2=rotated-session; Path=/"]]),
    ]);
    await transport.send(post(`${ORIGIN}/ajax/change_mydon.php`));
    expect(session.value).toBe("rotated-session");
  });
});
