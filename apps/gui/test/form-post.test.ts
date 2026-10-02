/**
 * The rules both transports post a form by: the body as a browser encodes it, which redirects
 * follow a post, and where a redirect leads.
 */
import { describe, expect, test } from "bun:test";

import { encodeForm, POST_FOLLOWED_AS_GET, resolveRedirect } from "../src/hiroba-session";

describe("encodeForm", () => {
  test("keeps the pairs in the order given, repeated names included", () => {
    expect(
      encodeForm([
        ["_tckt", "sample-ticket"],
        ["color_face", "3"],
        ["color_body", "12"],
        ["color_face", "4"],
      ]),
    ).toBe("_tckt=sample-ticket&color_face=3&color_body=12&color_face=4");
  });

  test("writes a space as + and the reserved characters, ~ included, as percent escapes", () => {
    expect(encodeForm([["note", "a b&c=~"]])).toBe("note=a+b%26c%3D%7E");
  });

  test("writes non-ASCII text as the UTF-8 bytes of a browser's form", () => {
    expect(encodeForm([["newName", "サンプル"]])).toBe(
      "newName=%E3%82%B5%E3%83%B3%E3%83%97%E3%83%AB",
    );
  });

  test("writes an empty form and an empty value as a browser does", () => {
    expect(encodeForm([])).toBe("");
    expect(encodeForm([["costume_1", ""]])).toBe("costume_1=");
  });
});

describe("POST_FOLLOWED_AS_GET", () => {
  type StatusCase = [status: number, followed: boolean];
  test.each<StatusCase>([
    [301, true],
    [302, true],
    [303, true],
    [307, false],
    [308, false],
    [300, false],
    [200, false],
    [404, false],
  ])("a post answered %p is followed with a GET: %p", (status, followed) => {
    expect(POST_FOLLOWED_AS_GET.has(status)).toBe(followed);
  });
});

describe("resolveRedirect", () => {
  const FROM = "https://hiroba.test/ajax/change_mydon.php";

  type LocationCase = [label: string, location: string, leadsTo: string | null];
  test.each<LocationCase>([
    ["a path from the root", "/mypage_top.php?again", "https://hiroba.test/mypage_top.php?again"],
    ["a path beside the page", "login.php", "https://hiroba.test/ajax/login.php"],
    ["an absolute address", "http://elsewhere.test/x", "http://elsewhere.test/x"],
    ["a script", "javascript:alert(1)", null],
    ["a file", "file:///etc/passwd", null],
    ["a data address", "data:text/html,x", null],
    ["an address that does not parse", "http://", null],
  ])("%s, %p, leads to %p", (_label, location, leadsTo) => {
    expect(resolveRedirect(location, FROM)).toBe(leadsTo);
  });
});
