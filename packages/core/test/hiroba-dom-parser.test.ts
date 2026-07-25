/**
 * Excerpts, not captured pages — see README.md in this directory for why. The logged-out excerpt
 * mirrors the one marker unique to Hiroba's login page: the form submitting to login_process.php.
 */
import { describe, expect, test } from "bun:test";

import { isErr, isOk, parsePage, requireMarker } from "../src/index";

const LOGGED_OUT_EXCERPT = `
<html><body>
  <div id="login" class="contentBox formArea">
    <form name="login_form" id="login_form" method="get" action="./login_process.php">
      <input type="submit" value="LOGIN" />
    </form>
  </div>
</body></html>`;

const PROFILE_EXCERPT = `
<html><body>
  <div id="mydon_area">
    <div>Placeholder Title</div>
    <div><div>Donder</div></div>
  </div>
</body></html>`;

describe("parsePage", () => {
  test("accepts a logged-in page", () => {
    const result = parsePage(PROFILE_EXCERPT, "mypage_top.php");

    if (!isOk(result)) {
      throw new Error("expected the page to parse");
    }
    expect(result.value.querySelector("#mydon_area")).not.toBeNull();
  });

  test("refuses the login page as loggedOut, naming the requested page", () => {
    const result = parsePage(LOGGED_OUT_EXCERPT, "score_list.php");

    if (!isErr(result)) {
      throw new Error("expected a loggedOut failure");
    }
    expect(result.error).toEqual({ kind: "loggedOut", page: "score_list.php" });
  });

  test("does not throw on a body that is not HTML at all", () => {
    const result = parsePage("%%% not markup at all >>>", "mypage_top.php");

    // Lenient parsing: garbage yields a document whose markers are simply absent.
    expect(isOk(result)).toBe(true);
  });

  test("an ordinary link to login.php is not mistaken for the login page", () => {
    // Logged-in pages may link to the login flow; only the login form itself means logged out.
    const withLink = `<html><body>
      <div id="mydon_area"><div>Placeholder Title</div></div>
      <a href="./login.php?mode=logout">logout</a>
    </body></html>`;

    expect(isOk(parsePage(withLink, "mypage_top.php"))).toBe(true);
  });
});

describe("requireMarker", () => {
  test("returns the element when the marker is present", () => {
    const page = parsePage(PROFILE_EXCERPT, "mypage_top.php");
    if (!isOk(page)) {
      throw new Error("expected the page to parse");
    }

    const area = requireMarker(page.value, "#mydon_area", "mypage_top.php");

    if (!isOk(area)) {
      throw new Error("expected the marker to be found");
    }
    expect(area.value.querySelector("div")?.textContent).toBe("Placeholder Title");
  });

  test("fails naming the page and the selector that found nothing", () => {
    const page = parsePage(PROFILE_EXCERPT, "mypage_top.php");
    if (!isOk(page)) {
      throw new Error("expected the page to parse");
    }

    const missing = requireMarker(page.value, "#costume_1", "mypage_top.php");

    if (!isErr(missing)) {
      throw new Error("expected a missingMarker failure");
    }
    expect(missing.error).toEqual({
      kind: "missingMarker",
      page: "mypage_top.php",
      marker: "#costume_1",
    });
  });
});
