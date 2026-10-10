import { describe, expect, test } from "bun:test";

import { err, ok, refreshHiroba, type Transport } from "../src/index";
import { type Answer, answer, fakeHiroba, NOON_JST, ORIGIN } from "./profile-fixtures";

const IN_THE_BREAK = new Date("2026-09-26T20:30:00Z");

function refresh(transport: Transport, now = NOON_JST) {
  return refreshHiroba({ transport, hirobaOrigin: ORIGIN, now: () => now });
}

const loginPage = (): Answer =>
  ok({
    status: 200,
    url: `${ORIGIN}/login.php`,
    headers: { "content-type": "text/html" },
    body: new TextEncoder().encode('<form id="login_form"></form>'),
  });

describe("refreshHiroba", () => {
  test("reads my page for a fresh token, then posts it once, and Hiroba refreshes", async () => {
    const { hiroba, transport, routes, postsTo } = fakeHiroba();

    const refreshed = await refresh(transport);

    expect(refreshed).toEqual(ok(undefined));
    expect(routes()).toEqual(["GET mypage_top.php", "POST ajax/update_score.php"]);
    expect(hiroba.refreshes).toBe(1);
    const [post] = postsTo("ajax/update_score.php");
    expect(post?.form).toEqual([["_tckt", "1".padStart(32, "0")]]);
    expect(post?.headers).toMatchObject({
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${ORIGIN}/mypage_top.php`,
    });
  });

  test("sends nothing in the 05:00-07:00 JST break", async () => {
    const { transport, routes } = fakeHiroba();

    expect(await refresh(transport, IN_THE_BREAK)).toEqual(err({ kind: "maintenance" }));
    expect(routes()).toEqual([]);
  });

  test.each([705, 901, 1])(
    "answers %p as not refreshed, with the result in its codes",
    async (code) => {
      const { hiroba, transport, routes } = fakeHiroba();
      hiroba.refreshResult = code;

      const refreshed = await refresh(transport);

      expect(refreshed.ok).toBe(false);
      expect(!refreshed.ok && refreshed.error).toMatchObject({ kind: "notRefreshed" });
      expect(!refreshed.ok && "detail" in refreshed.error && refreshed.error.detail).toStartWith(
        `result=${code} `,
      );
      expect(routes()).toHaveLength(2);
    },
  );

  test("posts nothing when my page does not arrive", async () => {
    const { transport, routes } = fakeHiroba();
    const unreachable: Transport = {
      send: async (request) =>
        request.method === "GET"
          ? err({ kind: "unreachable", url: request.url })
          : transport.send(request),
    };

    expect(await refresh(unreachable)).toEqual(err({ kind: "unreachable" }));
    expect(routes()).toEqual([]);
  });

  test("gives an answer that is not JSON as not refreshed, with its codes and no body", async () => {
    const { transport } = fakeHiroba();
    const errorPage: Transport = {
      send: async (request) =>
        request.method === "POST"
          ? answer("ajax/update_score.php", "<h1>エラー</h1><table>x</table>", "text/html")
          : transport.send(request),
    };

    const refreshed = await refresh(errorPage);

    expect(!refreshed.ok && refreshed.error).toMatchObject({ kind: "notRefreshed" });
    expect(JSON.stringify(refreshed)).not.toContain("エラー");
  });

  test("ends at the session's end when the post and one more read of my page land on the login page", async () => {
    const { transport, routes } = fakeHiroba();
    let signedOut = false;
    const ending: Transport = {
      async send(request) {
        if (signedOut) {
          return loginPage();
        }
        if (request.method === "POST") {
          signedOut = true;
          return loginPage();
        }
        return transport.send(request);
      },
    };

    expect(await refresh(ending)).toEqual(err({ kind: "loggedOut" }));
    expect(routes()).toEqual(["GET mypage_top.php"]);
  });
});
