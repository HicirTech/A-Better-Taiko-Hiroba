/**
 * Where a page read for a write ends, looked at before its body is: the login page is a lost
 * session, a card still to be chosen is a sign-in not finished, and a page that ended anywhere but
 * Hiroba is not read at all. Judged by parsed origin and path, so no host that only looks like
 * Hiroba's passes for it.
 */
import { describe, expect, test } from "bun:test";

import {
  err,
  type HirobaReadFailure,
  ok,
  type ReadDeps,
  readHirobaPage,
  sessionEnded,
  type Transport,
  type TransportRequest,
} from "../src/index";

const ORIGIN = "https://hiroba.test";

/** Reads `path` from a Hiroba whose answer ends at `landedAt`, and tells what the parser was given. */
async function readEndingAt(landedAt: string) {
  const sent: TransportRequest[] = [];
  const parsed: string[] = [];
  const transport: Transport = {
    async send(request) {
      sent.push(request);
      return ok({
        status: 200,
        url: landedAt,
        headers: { "content-type": "text/html; charset=UTF-8" },
        body: new TextEncoder().encode("<p>page</p>"),
      });
    },
  };
  const deps: ReadDeps = { transport, hirobaOrigin: ORIGIN };
  const read = await readHirobaPage(deps, "mypage_kisekae.php", (html) => {
    parsed.push(html);
    return ok(html);
  });
  return { read, sent, parsed };
}

describe("readHirobaPage", () => {
  test("reads a page that ended on Hiroba, once, and hands its text to the parser", async () => {
    const { read, sent, parsed } = await readEndingAt(`${ORIGIN}/mypage_kisekae.php`);
    expect(read).toEqual(ok("<p>page</p>"));
    expect(sent).toEqual([{ method: "GET", url: `${ORIGIN}/mypage_kisekae.php` }]);
    expect(parsed).toEqual(["<p>page</p>"]);
  });

  test("an answer that ended on either login page is a lost session, whatever it holds", async () => {
    for (const path of ["login.php", "login_process.php"]) {
      const { read, parsed } = await readEndingAt(`${ORIGIN}/${path}`);
      expect(read).toEqual(err({ kind: "loggedOut" }));
      expect(parsed).toEqual([]);
    }
  });

  test("an answer that ended on the card-select page is a sign-in not finished", async () => {
    const { read, parsed } = await readEndingAt(`${ORIGIN}/login_select.php`);
    expect(read).toEqual(err({ kind: "cardSelectUnfinished" }));
    expect(parsed).toEqual([]);
  });

  test("an answer that ended off Hiroba is not read, and says where by path and status alone", async () => {
    const { read, parsed } = await readEndingAt("https://elsewhere.test/landing?token=x");
    expect(read).toEqual(
      err({
        kind: "unexpectedPage",
        detail: "landing=elsewhere path=/landing status=200 type=text/html; charset=UTF-8 bytes=11",
      }),
    );
    expect(parsed).toEqual([]);
  });

  test("a host that only looks like Hiroba's, with a login path, is not Hiroba", async () => {
    for (const url of [
      `${ORIGIN}.evil.test/login.php`,
      "http://hiroba.test/login.php",
      "https://hiroba.test:8443/login.php",
    ]) {
      const { read, parsed } = await readEndingAt(url);
      expect(read.ok === false && read.error.kind).toBe("unexpectedPage");
      expect(parsed).toEqual([]);
    }
  });

  test("a request that never got an answer fails by its kind alone", async () => {
    const transport: Transport = {
      async send(request) {
        return err({ kind: "timedOut", url: request.url });
      },
    };
    const read = await readHirobaPage({ transport, hirobaOrigin: ORIGIN }, "mypage_top.php", ok);
    expect(read).toEqual(err({ kind: "timedOut" }));
  });
});

describe("sessionEnded", () => {
  test("is true for the login page and for a card not chosen, and for nothing else", () => {
    const kinds: HirobaReadFailure["kind"][] = [
      "loggedOut",
      "cardSelectUnfinished",
      "siteError",
      "unexpectedPage",
      "timedOut",
      "unreachable",
      "cancelled",
    ];
    expect(kinds.filter((kind) => sessionEnded({ kind }))).toEqual([
      "loggedOut",
      "cardSelectUnfinished",
    ]);
  });
});
