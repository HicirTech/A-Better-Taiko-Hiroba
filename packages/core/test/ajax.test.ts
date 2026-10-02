/**
 * The ajax post every write sends, against a stand-in transport: what it sends, and how what comes
 * back is sorted before any result code is read.
 */
import { describe, expect, test } from "bun:test";

import {
  type AjaxAnswer,
  err,
  FormToken,
  ok,
  postAjax,
  readPrecheck,
  readSaveCode,
  readSaveMessage,
  type Transport,
  type TransportRequest,
  type TransportResponse,
} from "../src/index";

const ORIGIN = "https://hiroba.test";
const TOKEN = "0123456789abcdef0123456789abcdef";
const POST = {
  path: "ajax/change_mydon.php",
  referer: "mypage_kisekae.php",
  form: [
    ["_tckt", new FormToken(TOKEN)],
    ["color_face", "3"],
  ],
} as const;

/** Answers every request with `answer` and keeps what it was asked. */
function answering(answer: Awaited<ReturnType<Transport["send"]>>) {
  const sent: TransportRequest[] = [];
  const transport: Transport = {
    async send(request) {
      sent.push(request);
      return answer;
    },
  };
  return { sent, transport };
}

const response = (
  body: string,
  type: string,
  status = 200,
  url = `${ORIGIN}/ajax/change_mydon.php`,
): Awaited<ReturnType<Transport["send"]>> =>
  ok({
    status,
    url,
    headers: { "content-type": type },
    body: new TextEncoder().encode(body),
  } satisfies TransportResponse);

/** The site's error page, as the missing-header rejection answers. */
const ERROR_SHELL =
  "<html><body><h1>エラー</h1><table><tr><td>リクエストされたページは存在しません</td></tr></table></body></html>";

async function sortedAs(answer: Awaited<ReturnType<Transport["send"]>>): Promise<AjaxAnswer> {
  return postAjax(answering(answer).transport, ORIGIN, POST);
}

describe("postAjax", () => {
  test("sends one post, with the ajax headers and the token revealed in its place", async () => {
    const { sent, transport } = answering(response(`{"result":0}`, "application/json"));
    await postAjax(transport, ORIGIN, POST);
    expect(sent).toEqual([
      {
        method: "POST",
        url: `${ORIGIN}/ajax/change_mydon.php`,
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Accept: "application/json, text/javascript, */*; q=0.01",
          Origin: ORIGIN,
          Referer: `${ORIGIN}/mypage_kisekae.php`,
        },
        form: [
          ["_tckt", TOKEN],
          ["color_face", "3"],
        ],
      },
    ]);
  });

  test("reads JSON, a BOM before it included, and keeps the body out of the code", async () => {
    expect(await sortedAs(response(`{"result":0,"_tckt":""}`, "application/json"))).toEqual({
      kind: "json",
      value: { result: 0, _tckt: "" },
      code: "path=/ajax/change_mydon.php status=200 type=application/json bytes=23",
    });
    const withBom = await sortedAs(response(`﻿{"result":false}`, "application/json"));
    expect(withBom.kind === "json" && withBom.value).toEqual({ result: false });
    expect((await sortedAs(response("{result:", "application/json; charset=UTF-8"))).kind).toBe(
      "unexpected",
    );
  });

  test("tells the site's error page, a login page and a 404 apart", async () => {
    expect((await sortedAs(response(ERROR_SHELL, "text/html; charset=utf-8"))).kind).toBe(
      "rejected",
    );
    expect(
      (await sortedAs(response("<p>login</p>", "text/html", 200, `${ORIGIN}/login.php`))).kind,
    ).toBe("endedAtLogin");
    expect(
      (await sortedAs(response("<p>x</p>", "text/html", 200, `${ORIGIN}/login_select.php`))).kind,
    ).toBe("endedAtLogin");
    expect(
      (await sortedAs(response(`<form id="login_form"></form>`, "text/html; charset=utf-8"))).kind,
    ).toBe("endedAtLogin");
    expect(
      (
        await sortedAs(
          response("<h1>Not Found</h1>", "text/html; charset=iso-8859-1", 404, `${ORIGIN}/x.php`),
        )
      ).kind,
    ).toBe("endpointMissing");
    expect((await sortedAs(response("<p>other</p>", "text/html"))).kind).toBe("unexpected");
    expect((await sortedAs(response("", "text/plain", 500))).kind).toBe("unexpected");
  });

  test("reads JSON only from Hiroba's origin with a 2xx, so no stray false clears a write", async () => {
    const offOrigin = await sortedAs(
      response(`{"result":false}`, "application/json", 200, "https://elsewhere.test/landing"),
    );
    expect(offOrigin).toEqual({
      kind: "unexpected",
      code: "landing=elsewhere path=/landing status=200 type=application/json bytes=16",
    });
    expect(readPrecheck(offOrigin)).toBe("unexpected");

    const serverError = await sortedAs(response(`{"result":false}`, "application/json", 500));
    expect(serverError).toEqual({
      kind: "unexpected",
      code: "path=/ajax/change_mydon.php status=500 type=application/json bytes=16",
    });
    expect(readPrecheck(serverError)).toBe("unexpected");
    expect((await sortedAs(response(`{"result":false}`, "application/json", 404))).kind).toBe(
      "endpointMissing",
    );
  });

  test("reads JSON from a 2xx alone: not from a redirect handed back, not from below it", async () => {
    // 3xx answers reach here unfollowed (a 307 or 308 after a post, any 3xx with no Location).
    for (const status of [199, 300, 302, 307, 308, 399]) {
      const answer = await sortedAs(response(`{"result":false}`, "application/json", status));
      expect(answer).toEqual({
        kind: "unexpected",
        code: `path=/ajax/change_mydon.php status=${status} type=application/json bytes=16`,
      });
      expect(readPrecheck(answer)).toBe("unexpected");
    }
    for (const status of [200, 201, 299]) {
      const answer = await sortedAs(response(`{"result":false}`, "application/json", status));
      expect(answer.kind).toBe("json");
      expect(readPrecheck(answer)).toBe("clear");
    }
  });

  test("an answer that never came is noAnswer, by kind only", async () => {
    expect(
      await sortedAs(err({ kind: "timedOut", url: `${ORIGIN}/ajax/change_mydon.php` })),
    ).toEqual({ kind: "noAnswer", failure: "timedOut", code: "noAnswer=timedOut" });
  });
});

describe("readPrecheck", () => {
  const json = (value: unknown): AjaxAnswer => ({ kind: "json", value, code: "" });

  test("only the boolean false is clear", () => {
    expect(readPrecheck(json({ result: false }))).toBe("clear");
  });

  test('true, 1 and "1" ask for a confirmation, as the site\'s == true reads them', () => {
    for (const result of [true, 1, "1"]) {
      expect(readPrecheck(json({ result }))).toBe("needsConfirmation");
    }
  });

  test("every other value, and every answer that is not JSON, stops", () => {
    for (const value of [
      { result: 0 },
      { result: "0" },
      { result: null },
      {},
      { result: "false" },
    ]) {
      expect(readPrecheck(json(value))).toBe("unexpected");
    }
    expect(readPrecheck(json(false))).toBe("unexpected");
    expect(readPrecheck({ kind: "rejected", code: "" })).toBe("rejected");
    expect(readPrecheck({ kind: "endedAtLogin", code: "" })).toBe("endedAtLogin");
    expect(readPrecheck({ kind: "noAnswer", failure: "timedOut", code: "" })).toBe("noAnswer");
  });
});

describe("readSaveCode", () => {
  test("reads a whole number, or a string of digits", () => {
    expect(readSaveCode({ result: 0 })).toBe(0);
    expect(readSaveCode({ result: "0" })).toBe(0);
    expect(readSaveCode({ result: "12" })).toBe(12);
    expect(readSaveCode({ result: 705 })).toBe(705);
  });

  test("reads nothing else as a code, least of all as 0", () => {
    for (const result of ["", null, false, [], " ", 1.5, "1.5", "-1", true]) {
      expect(readSaveCode({ result })).toBeNull();
    }
    expect(readSaveCode({})).toBeNull();
    expect(readSaveCode(null)).toBeNull();
    expect(readSaveCode([0])).toBeNull();
  });
});

describe("readSaveMessage", () => {
  test("keeps errmsg as text, and nothing when it is missing or empty", () => {
    expect(readSaveMessage({ errmsg: "更新しました。" })).toBe("更新しました。");
    expect(readSaveMessage({ errmsg: "" })).toBeNull();
    expect(readSaveMessage({ errmsg: 3 })).toBeNull();
    expect(readSaveMessage({})).toBeNull();
  });

  test("keeps err_message, which the profile endpoint writes, as text", () => {
    expect(readSaveMessage({ err_message: "不適切用語は使用できません" })).toBe(
      "不適切用語は使用できません",
    );
    expect(readSaveMessage({ err_message: "" })).toBeNull();
    expect(readSaveMessage({ err_message: ["x"] })).toBeNull();
  });

  test("reads errmsg first, and err_message when errmsg holds nothing", () => {
    expect(readSaveMessage({ errmsg: "one", err_message: "two" })).toBe("one");
    expect(readSaveMessage({ errmsg: "", err_message: "two" })).toBe("two");
    expect(readSaveMessage({ errmsg: 3, err_message: "two" })).toBe("two");
    expect(readSaveMessage({ errmsg: "", err_message: "" })).toBeNull();
  });

  test("reads nothing from an answer that is no object", () => {
    for (const value of [null, undefined, "err_message", 3, ["err_message"]]) {
      expect(readSaveMessage(value)).toBeNull();
    }
  });
});
