/**
 * Android's transport against a stand-in for Capacitor's native HTTP client: what it asks the
 * platform to send, and what it hands back.
 */
import { beforeEach, describe, expect, test } from "bun:test";

import { native } from "./capacitor-fakes";

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
    expect(native.httpRequests[0]?.responseType).toBe("text");
  });

  test("hands back the final URL, lower-cased headers without set-cookie, and UTF-8 bytes", async () => {
    native.httpAnswer = async () => ({
      status: 200,
      url: "https://hiroba.test/login.php",
      headers: { "Content-Type": "text/html", "Set-Cookie": "_token_v2=x" },
      data: "ドンだー",
    });
    const sent = await createAndroidTransport(UA).send({ method: "GET", url: URL_ });
    expect(sent.ok && sent.value.url).toBe("https://hiroba.test/login.php");
    expect(sent.ok && sent.value.headers).toEqual({ "content-type": "text/html" });
    expect(sent.ok && new TextDecoder().decode(sent.value.body)).toBe("ドンだー");
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
