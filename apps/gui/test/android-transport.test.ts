/**
 * Android's transport against a stand-in for Capacitor's native HTTP client: what it asks the
 * platform to send, and what it hands back.
 */
import { beforeEach, describe, expect, test } from "bun:test";

import { native, nativeBase64 } from "./capacitor-fakes";

const { createAndroidTransport } = await import("../src/platform/android-transport");

const UA = "Mozilla/5.0 (Linux; Android 16; wv) Chrome/153.0.0.0 Mobile Safari/537.36";
const URL_ = "https://hiroba.test/mypage_top.php";

/** How Capacitor rejects: a CapacitorException carrying the Java class name as `code`. */
const nativeError = (code: string, message: string) => Object.assign(new Error(message), { code });

describe("createAndroidTransport", () => {
  beforeEach(() => native.reset());

  test("sends the WebView's identity and no cookie of its own", async () => {
    native.httpAnswer = async () => ({ status: 200, url: URL_, headers: {}, data: "" });
    await createAndroidTransport(UA).send({
      method: "GET",
      url: URL_,
      headers: { Cookie: "x=1", "user-agent": "curl" },
    });
    expect(native.httpRequests[0]?.headers).toEqual({ "User-Agent": UA });
    expect(native.httpRequests[0]?.responseType).toBe("arraybuffer");
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
