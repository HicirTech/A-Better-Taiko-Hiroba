/**
 * The core's ajax post over the real Android transport and the fake native client: each kind of
 * answer a write meets is read as the same kind it is on the desktop, and a whole costume write
 * reaches the mock's editor as the site's own script would send it.
 */
import { beforeEach, describe, expect, test } from "bun:test";
import { changeCostume, postAjax } from "@abth/core";

import {
  createCostumeEditor,
  ERROR_SHELL_BODY,
  INITIAL_COSTUME,
  type MockSession,
  type PostRecord,
} from "../scripts/mock-costume";
import { type NativeHttpAnswer, native, nativeBase64 } from "./capacitor-fakes";
import { standIn } from "./hiroba-stand-in";

const { createAndroidTransport } = await import("../src/platform/android-transport");

const UA = "Mozilla/5.0 (Linux; Android 16; wv) Chrome/153.0.0.0 Mobile Safari/537.36";
const ORIGIN = "https://hiroba.test";
const SAVE_URL = `${ORIGIN}/ajax/change_mydon.php`;
const HTML = { "Content-Type": "text/html; charset=utf-8" };
const POST = {
  path: "ajax/change_mydon.php",
  referer: "mypage_kisekae.php",
  form: [
    ["_tckt", "sample-ticket"],
    ["color_face", "3"],
  ],
} as const;

/** An answer as Capacitor gives one, for a test to queue. */
const answer =
  (status: number, headers: Record<string, string>, data: unknown = "", url = SAVE_URL) =>
  async (): Promise<NativeHttpAnswer> => ({ status, url, headers, data });

const sendPost = () => postAjax(createAndroidTransport(UA), ORIGIN, POST);

describe("postAjax over Android's transport", () => {
  beforeEach(() => native.reset());

  test("reads a JSON answer, which Capacitor parses, as the handler's own", async () => {
    native.httpAnswers.push(
      answer(200, { "Content-Type": "application/json;charset=UTF-8" }, { result: false }),
    );
    expect(await sendPost()).toEqual({
      kind: "json",
      value: { result: false },
      code: `path=/ajax/change_mydon.php status=200 type=application/json;charset=UTF-8 bytes=${'{"result":false}'.length}`,
    });
  });

  test("reads the site's error page, answered at 200, as a post the handler never saw", async () => {
    native.httpAnswers.push(answer(200, HTML, nativeBase64(ERROR_SHELL_BODY)));
    expect((await sendPost()).kind).toBe("rejected");
  });

  test("reads a post sent on to the login page as one that ended there", async () => {
    native.httpAnswers.push(
      answer(302, { Location: "/login.php" }),
      answer(200, HTML, nativeBase64(`<form id="login_form"></form>`), `${ORIGIN}/login.php`),
    );
    expect((await sendPost()).kind).toBe("endedAtLogin");
    expect(native.httpRequests.map(({ method }) => method)).toEqual(["POST", "GET"]);
  });

  test("reads a plain 404 as an endpoint that is not there", async () => {
    native.httpAnswers.push(answer(404, HTML, "not found"));
    expect((await sendPost()).kind).toBe("endpointMissing");
  });

  test("reads a 307, a landing off Hiroba and JSON with an error status as unexpected", async () => {
    native.httpAnswers.push(answer(307, { Location: "/mypage_top.php" }));
    expect((await sendPost()).kind).toBe("unexpected");
    expect(native.httpRequests).toHaveLength(1);

    native.reset();
    native.httpAnswers.push(
      answer(302, { Location: "https://elsewhere.test/x" }),
      answer(200, HTML, nativeBase64("<p>x</p>"), "https://elsewhere.test/x"),
    );
    expect(await sendPost()).toMatchObject({
      kind: "unexpected",
      code: "landing=elsewhere path=/x status=200 type=text/html; charset=utf-8 bytes=8",
    });

    native.reset();
    native.httpAnswers.push(answer(500, { "Content-Type": "application/json" }, { result: false }));
    expect((await sendPost()).kind).toBe("unexpected");
  });

  test("reads a timeout and another failure as no answer, each after one call", async () => {
    const failureOf = async (code: string) => {
      native.reset();
      native.httpAnswer = async () => {
        throw Object.assign(new Error("failed"), { code });
      };
      const sent = await sendPost();
      expect(native.httpRequests).toHaveLength(1);
      return sent;
    };
    expect(await failureOf("SocketTimeoutException")).toEqual({
      kind: "noAnswer",
      failure: "timedOut",
      code: "noAnswer=timedOut",
    });
    expect(await failureOf("UnknownHostException")).toEqual({
      kind: "noAnswer",
      failure: "unreachable",
      code: "noAnswer=unreachable",
    });
  });
});

describe("a costume write over Android's transport", () => {
  beforeEach(() => native.reset());

  test("reaches the mock's editor as the site's own script posts it", async () => {
    const editor = createCostumeEditor();
    const session: MockSession = { cardChosen: true };
    standIn({ editor, session, myPage: "<p>my page</p>" });
    const before = { ...INITIAL_COSTUME };
    const set = (state: Record<string, number>) => ({
      colorBody: state.color_body ?? -1,
      colorLimb: state.color_limb ?? -1,
      colorFace: state.color_face ?? -1,
      costume1: state.costume_1 ?? -1,
      costume2: state.costume_2 ?? -1,
      costume3: state.costume_3 ?? -1,
      costume4: state.costume_4 ?? -1,
      costume5: state.costume_5 ?? -1,
    });

    const outcome = await changeCostume(
      { expected: set(before), target: { ...set(before), colorFace: 3 } },
      {
        transport: createAndroidTransport(UA),
        hirobaOrigin: ORIGIN,
        now: () => new Date("2026-09-27T03:00:00Z"),
        crossCheck: false,
        beginUndo: async () => undefined,
      },
    );

    expect(outcome.kind).toBe("applied");
    const posts = (await editor.hook("/__posts", new URLSearchParams())?.json()) as PostRecord[];
    expect(posts.map(({ path }) => path)).toEqual([
      "/ajax/check_ip_kisekae.php",
      "/ajax/change_mydon.php",
    ]);
    for (const post of posts) {
      expect(post).toMatchObject({
        xRequestedWith: "XMLHttpRequest",
        origin: ORIGIN,
        referer: `${ORIGIN}/mypage_kisekae.php`,
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        fields: [
          "_tckt",
          "color_body",
          "color_limb",
          "color_face",
          "costume_1",
          "costume_2",
          "costume_3",
          "costume_4",
          "costume_5",
        ],
        ticketMatched: true,
      });
    }
    expect(
      native.httpRequests.map(({ method, url }) => `${method} ${new URL(url).pathname}`),
    ).toEqual([
      "GET /mypage_kisekae.php",
      "POST /ajax/check_ip_kisekae.php",
      "POST /ajax/change_mydon.php",
      "GET /mypage_kisekae.php",
    ]);
  });
});
