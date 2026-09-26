import { describe, expect, test } from "bun:test";

import { signInStep } from "../src/hiroba-session";

const ENDPOINTS = { hirobaOrigin: "https://hiroba.test", idpHost: "id.test" };

describe("signInStep", () => {
  test.each([
    ["https://hiroba.test/login.php", "hirobaLogin"],
    ["https://hiroba.test/login_process.php?mode=exec", "hirobaLogin"],
    ["https://id.test/login.html?client_id=x", "idp"],
    ["https://id.test/passkeyInfo.html", "idp"],
    ["https://hiroba.test/login_select.php", "cardSelect"],
    ["https://hiroba.test/index.php", "landed"],
    ["https://hiroba.test/some_callback.php?code=x", "otherHiroba"],
    ["https://hiroba.test/mypage_top.php", "otherHiroba"],
    ["https://elsewhere.test/index.php", "elsewhere"],
  ] as const)("%s is %s", (url, step) => {
    expect(signInStep(url, ENDPOINTS)).toBe(step);
  });

  test("never reads a host out of the query string", () => {
    const url = "https://id.test/login.html?redirect_uri=https%3A%2F%2Fhiroba.test%2Findex.php";
    expect(signInStep(url, ENDPOINTS)).toBe("idp");
    expect(signInStep("https://other.test/?https://hiroba.test/index.php", ENDPOINTS)).toBe(
      "elsewhere",
    );
  });

  test("treats a missing or unparseable URL as elsewhere", () => {
    expect(signInStep(undefined, ENDPOINTS)).toBe("elsewhere");
    expect(signInStep("not a url", ENDPOINTS)).toBe("elsewhere");
  });
});
