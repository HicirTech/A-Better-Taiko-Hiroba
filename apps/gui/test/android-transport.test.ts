/**
 * Android's transport against a stand-in for Capacitor's native HTTP client: what it asks the
 * platform to send, and what it hands back.
 */
import { beforeEach, describe, expect, test } from "bun:test";
import { err, type TransportPost } from "@abth/core";

import { ERROR_SHELL_BODY } from "../scripts/mock-costume";
import { type NativeHttpAnswer, native, nativeBase64 } from "./capacitor-fakes";

const { createAndroidTransport } = await import("../src/platform/android-transport");

const UA = "Mozilla/5.0 (Linux; Android 16; wv) Chrome/153.0.0.0 Mobile Safari/537.36";
const URL_ = "https://hiroba.test/mypage_top.php";
const POST_URL = "https://hiroba.test/ajax/change_mydon.php";
const FORM_TYPE = "application/x-www-form-urlencoded; charset=UTF-8";
const TIMEOUT_MS = 20_000;

/** How Capacitor rejects: a CapacitorException carrying the Java class name as `code`. */
const nativeError = (code: string, message: string) => Object.assign(new Error(message), { code });

/** An answer as Capacitor gives one, for a test to queue. */
const answer = (
  status: number,
  headers: Record<string, string>,
  data: unknown = "",
  url = POST_URL,
): (() => Promise<NativeHttpAnswer>) => {
  return async () => ({ status, url, headers, data });
};

/** A post as a write sends one: a token first, then the fields, in the page's order. */
const post = (headers: Record<string, string> = {}): TransportPost => ({
  method: "POST",
  url: POST_URL,
  headers,
  form: [
    ["_tckt", "sample-ticket"],
    ["color_face", "3"],
    ["note", "a b&c=~"],
  ],
});

describe("createAndroidTransport", () => {
  beforeEach(() => native.reset());

  test("sends the WebView's identity and no cookie of its own", async () => {
    native.httpAnswer = async () => ({ status: 200, url: URL_, headers: {}, data: "" });
    await createAndroidTransport(UA).send({
      method: "GET",
      url: URL_,
      headers: { Cookie: "x=1", "user-agent": "curl", "Content-Type": "text/plain" },
    });
    expect(native.httpRequests[0]?.headers).toEqual({ "User-Agent": UA });
    expect(native.httpRequests[0]?.responseType).toBe("arraybuffer");
  });

  test("a read keeps the platform's own redirect following and sends no body", async () => {
    native.httpAnswer = async () => ({ status: 200, url: URL_, headers: {}, data: "" });
    await createAndroidTransport(UA).send({ method: "GET", url: URL_ });
    const [asked] = native.httpRequests;
    expect(asked).toMatchObject({ method: "GET", connectTimeout: TIMEOUT_MS });
    expect(asked).not.toHaveProperty("disableRedirects");
    expect(asked).not.toHaveProperty("data");
    expect(asked?.headers).not.toHaveProperty("Content-Type");
  });

  test("hands back the final URL, lower-cased headers without set-cookie, and the page as sent", async () => {
    native.httpAnswer = async () => ({
      status: 200,
      url: "https://hiroba.test/login.php",
      headers: { "Content-Type": "text/html", "Set-Cookie": "_token_v2=x" },
      data: nativeBase64("ドンだー\r\n\n"),
    });
    const sent = await createAndroidTransport(UA).send({ method: "GET", url: URL_ });
    expect(sent.ok && sent.value.url).toBe("https://hiroba.test/login.php");
    expect(sent.ok && sent.value.headers).toEqual({ "content-type": "text/html" });
    expect(sent.ok && new TextDecoder().decode(sent.value.body)).toBe("ドンだー\r\n\n");
  });

  test("brings an image back byte for byte, across Capacitor's base64 lines", async () => {
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const image = new Uint8Array([...pngSignature, ...Array.from({ length: 256 }, (_, i) => i)]);
    native.httpAnswer = async () => ({
      status: 200,
      url: URL_,
      headers: { "Content-Type": "image/png" },
      data: nativeBase64(image),
    });
    const sent = await createAndroidTransport(UA).send({ method: "GET", url: URL_ });
    expect(nativeBase64(image).split("\n").length).toBeGreaterThan(2);
    expect(sent.ok && [...sent.value.body]).toEqual([...image]);
  });

  test("keeps a JSON answer, which Capacitor parses whatever was asked for, as JSON text", async () => {
    const bodyOf = async (data: unknown) => {
      native.httpAnswer = async () => ({
        status: 200,
        url: URL_,
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        data,
      });
      const sent = await createAndroidTransport(UA).send({ method: "GET", url: URL_ });
      return sent.ok ? new TextDecoder().decode(sent.value.body) : null;
    };
    expect(await bodyOf({ result: 1 })).toBe('{"result":1}');
    expect(await bodyOf("unquoted")).toBe("unquoted");
  });

  test("reads an answer of 400 or more as the text Capacitor reads it as", async () => {
    native.httpAnswer = async () => ({
      status: 404,
      url: URL_,
      headers: { "Content-Type": "text/html" },
      data: "not found",
    });
    const sent = await createAndroidTransport(UA).send({ method: "GET", url: URL_ });
    expect(sent.ok && sent.value.status).toBe(404);
    expect(sent.ok && new TextDecoder().decode(sent.value.body)).toBe("not found");
  });

  test("tells a connect or read timeout from other failures by the native class name", async () => {
    const kindAfter = async (error: Error) => {
      native.httpAnswer = async () => {
        throw error;
      };
      const sent = await createAndroidTransport(UA).send({ method: "GET", url: URL_ });
      return sent.ok ? "ok" : sent.error;
    };
    expect(
      await kindAfter(
        nativeError("SocketTimeoutException", "failed to connect to hiroba.test after 20000ms"),
      ),
    ).toEqual({ kind: "timedOut", url: URL_ });
    expect(await kindAfter(nativeError("SocketTimeoutException", "Read timed out"))).toEqual({
      kind: "timedOut",
      url: URL_,
    });
    expect(
      await kindAfter(nativeError("UnknownHostException", "Unable to resolve host timeout.test")),
    ).toEqual({ kind: "unreachable", url: URL_ });
  });
});

describe("createAndroidTransport's posts", () => {
  beforeEach(() => native.reset());

  const text = (body: Uint8Array) => new TextDecoder().decode(body);
  const cancelled = err({ kind: "cancelled", url: POST_URL } as const);

  test("is one native call: the form already encoded, its own type, and no redirect following", async () => {
    native.httpAnswers.push(answer(200, { "Content-Type": "application/json" }, { result: false }));
    await createAndroidTransport(UA).send(
      post({
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json, text/javascript, */*; q=0.01",
        Origin: "https://hiroba.test",
        Referer: "https://hiroba.test/mypage_kisekae.php",
        Cookie: "_token_v2=x",
        "user-agent": "curl",
        "content-type": "text/plain",
      }),
    );
    expect(native.httpRequests).toHaveLength(1);
    const [asked] = native.httpRequests;
    expect(asked).toMatchObject({
      url: POST_URL,
      method: "POST",
      data: "_tckt=sample-ticket&color_face=3&note=a+b%26c%3D%7E",
      disableRedirects: true,
      responseType: "arraybuffer",
      connectTimeout: TIMEOUT_MS,
      readTimeout: TIMEOUT_MS,
    });
    expect(asked?.headers).toEqual({
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json, text/javascript, */*; q=0.01",
      Origin: "https://hiroba.test",
      Referer: "https://hiroba.test/mypage_kisekae.php",
      "User-Agent": UA,
      "Content-Type": FORM_TYPE,
    });
    expect(asked).not.toHaveProperty("dataType");
    expect(asked).not.toHaveProperty("params");
  });

  test("keeps the pairs in the order given, repeated names included", async () => {
    native.httpAnswers.push(answer(200, {}));
    await createAndroidTransport(UA).send({
      method: "POST",
      url: POST_URL,
      form: [
        ["b", "2"],
        ["a", "1"],
        ["b", "3"],
      ],
    });
    expect(native.httpRequests[0]?.data).toBe("b=2&a=1&b=3");
  });

  test.each([301, 302, 303])(
    "follows a post answered %p with one GET that has no body and no type",
    async (status) => {
      const landed = "https://hiroba.test/mypage_top.php?again";
      native.httpAnswers.push(
        answer(status, { Location: "/mypage_top.php?again" }),
        answer(
          200,
          { "Content-Type": "text/html; charset=UTF-8" },
          nativeBase64("<p>top</p>"),
          landed,
        ),
      );
      const sent = await createAndroidTransport(UA).send(
        post({ "X-Requested-With": "XMLHttpRequest", "Content-Type": "text/plain" }),
      );
      expect(native.httpRequests.map(({ method, url }) => [method, url])).toEqual([
        ["POST", POST_URL],
        ["GET", landed],
      ]);
      const second = native.httpRequests[1];
      expect(second?.headers).toEqual({ "X-Requested-With": "XMLHttpRequest", "User-Agent": UA });
      expect(second).not.toHaveProperty("data");
      expect(second).not.toHaveProperty("disableRedirects");
      expect(sent.ok && sent.value.url).toBe(landed);
      expect(sent.ok && text(sent.value.body)).toBe("<p>top</p>");
    },
  );

  test.each([307, 308])(
    "hands back a post answered %p as it is, without a second call",
    async (status) => {
      native.httpAnswers.push(answer(status, { Location: "/mypage_top.php?again" }));
      const sent = await createAndroidTransport(UA).send(post());
      expect(native.httpRequests).toHaveLength(1);
      expect(sent.ok && sent.value).toMatchObject({
        status,
        url: POST_URL,
        headers: { location: "/mypage_top.php?again" },
      });
    },
  );

  test("hands back a redirect that names no Location as it is", async () => {
    native.httpAnswers.push(answer(302, {}));
    const sent = await createAndroidTransport(UA).send(post());
    expect(native.httpRequests).toHaveLength(1);
    expect(sent.ok && sent.value.status).toBe(302);
  });

  test("fails a post whose redirect leads anywhere but http or https, after the post alone", async () => {
    native.httpAnswers.push(answer(302, { Location: "javascript:alert(1)" }));
    expect(await createAndroidTransport(UA).send(post())).toEqual({
      ok: false,
      error: { kind: "unreachable", url: POST_URL },
    });
    expect(native.httpRequests).toHaveLength(1);
  });

  test("brings a JSON answer, which Capacitor parses, back as JSON text with a lower-cased type", async () => {
    native.httpAnswers.push(
      answer(200, { "Content-Type": "application/json; charset=UTF-8" }, { result: 0 }),
    );
    const sent = await createAndroidTransport(UA).send(post());
    expect(sent.ok && text(sent.value.body)).toBe('{"result":0}');
    expect(sent.ok && sent.value.headers).toEqual({
      "content-type": "application/json; charset=UTF-8",
    });
  });

  test("brings the site's error page, answered at 200, back as it was sent", async () => {
    native.httpAnswers.push(
      answer(200, { "Content-Type": "text/html; charset=utf-8" }, nativeBase64(ERROR_SHELL_BODY)),
    );
    const sent = await createAndroidTransport(UA).send(post());
    expect(sent.ok && text(sent.value.body)).toBe(ERROR_SHELL_BODY);
  });

  test("brings a 404 back as the text Capacitor reads it as", async () => {
    native.httpAnswers.push(answer(404, { "Content-Type": "text/html" }, "not found"));
    const sent = await createAndroidTransport(UA).send(post());
    expect(sent.ok && [sent.value.status, text(sent.value.body)]).toEqual([404, "not found"]);
  });

  test("sends a post once: a timeout or another failure is the only call it made", async () => {
    const kindAfter = async (error: Error) => {
      native.reset();
      native.httpAnswer = async () => {
        throw error;
      };
      const sent = await createAndroidTransport(UA).send(post());
      expect(native.httpRequests).toHaveLength(1);
      return sent.ok ? "ok" : sent.error;
    };
    expect(await kindAfter(nativeError("SocketTimeoutException", "Read timed out"))).toEqual({
      kind: "timedOut",
      url: POST_URL,
    });
    expect(
      await kindAfter(nativeError("UnknownHostException", "Unable to resolve host hiroba.test")),
    ).toEqual({ kind: "unreachable", url: POST_URL });
  });

  test("a timeout of the GET after a redirect is the post's timeout, and neither call is repeated", async () => {
    native.httpAnswers.push(answer(302, { Location: "/mypage_top.php" }), async () => {
      throw nativeError("SocketTimeoutException", "Read timed out");
    });
    expect(await createAndroidTransport(UA).send(post())).toEqual({
      ok: false,
      error: { kind: "timedOut", url: POST_URL },
    });
    expect(native.httpRequests).toHaveLength(2);
  });

  test("a signal aborted before the post makes no call at all", async () => {
    const sent = await createAndroidTransport(UA).send(post(), AbortSignal.abort());
    expect(sent).toEqual(cancelled);
    expect(native.httpRequests).toEqual([]);
  });

  test("a signal that fires during the post ends the wait, and leaves the call to finish", async () => {
    const controller = new AbortController();
    let finish: () => void = () => undefined;
    native.httpAnswer = () =>
      new Promise((resolve) => {
        finish = () => resolve({ status: 200, url: POST_URL, headers: {}, data: "" });
      });
    const sending = createAndroidTransport(UA).send(post(), controller.signal);
    controller.abort();
    expect(await sending).toEqual(cancelled);
    expect(native.httpRequests).toHaveLength(1);
    finish();
  });
});
