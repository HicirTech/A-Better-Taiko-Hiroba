import { describe, expect, test } from "bun:test";

import { HIROBA_ENDPOINTS, signInStep } from "../src/hiroba-session";

const ENDPOINTS = {
  hirobaOrigin: "https://hiroba.test",
  idpHost: "id.test",
  idpDomain: "id.test",
  imgOrigin: null,
};

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

  test("compares origins, so either host on another scheme or port is elsewhere", () => {
    expect(signInStep("http://hiroba.test/index.php", ENDPOINTS)).toBe("elsewhere");
    expect(signInStep("http://hiroba.test/login.php", ENDPOINTS)).toBe("elsewhere");
    expect(signInStep("ws://hiroba.test/index.php", ENDPOINTS)).toBe("elsewhere");
    expect(signInStep("https://hiroba.test:8443/index.php", ENDPOINTS)).toBe("elsewhere");
    expect(signInStep("http://id.test/login.html", ENDPOINTS)).toBe("elsewhere");
    expect(signInStep("https://id.test:8443/login.html", ENDPOINTS)).toBe("elsewhere");
  });

  test("normalizes the origin before comparing it", () => {
    expect(signInStep("https://HIROBA.test:443/index.php", ENDPOINTS)).toBe("landed");
    expect(signInStep("https://ID.test:443/login.html", ENDPOINTS)).toBe("idp");
  });

  test("follows a plain-http stand-in on both hosts", () => {
    const mock = {
      hirobaOrigin: "http://hiroba.test:8807",
      idpHost: "id.test:8808",
      idpDomain: "id.test",
      imgOrigin: null,
    };
    expect(signInStep("http://hiroba.test:8807/index.php", mock)).toBe("landed");
    expect(signInStep("http://id.test:8808/login.html", mock)).toBe("idp");
    expect(signInStep("https://hiroba.test:8807/index.php", mock)).toBe("elsewhere");
    expect(signInStep("http://id.test/login.html", mock)).toBe("elsewhere");
    expect(signInStep("http://auth.id.test:8808/v2/oauth2/auth", mock)).toBe("idp");
  });

  test("walks every Bandai Namco ID host the real sign-in crosses", () => {
    // login_process.php redirects to www.bandainamcoid.com first, then to the form on
    // account.bandainamcoid.com; a rule that knew only the form's host stopped at the first hop.
    const auth = "https://www.bandainamcoid.com/v2/oauth2/auth?client_id=nbgi_taiko";
    expect(signInStep(auth, HIROBA_ENDPOINTS)).toBe("idp");
    expect(signInStep("https://account.bandainamcoid.com/login.html", HIROBA_ENDPOINTS)).toBe(
      "idp",
    );
    expect(signInStep("https://bandainamcoid.com/", HIROBA_ENDPOINTS)).toBe("idp");
    expect(signInStep("https://donderhiroba.jp/index.php", HIROBA_ENDPOINTS)).toBe("landed");
  });

  test("matches the ID domain on a label boundary, on Hiroba's scheme and the ID port only", () => {
    expect(signInStep("https://evilbandainamcoid.com/", HIROBA_ENDPOINTS)).toBe("elsewhere");
    expect(signInStep("https://bandainamcoid.com.evil.test/", HIROBA_ENDPOINTS)).toBe("elsewhere");
    expect(signInStep("http://www.bandainamcoid.com/v2/oauth2/auth", HIROBA_ENDPOINTS)).toBe(
      "elsewhere",
    );
    expect(signInStep("https://www.bandainamcoid.com:8443/", HIROBA_ENDPOINTS)).toBe("elsewhere");
    expect(signInStep("https://auth.id.test/v2/oauth2/auth", ENDPOINTS)).toBe("idp");
  });

  test("fails closed when the endpoints do not parse", () => {
    const broken = {
      hirobaOrigin: "not an origin",
      idpHost: "id.test",
      idpDomain: "id.test",
      imgOrigin: null,
    };
    expect(signInStep("https://hiroba.test/index.php", broken)).toBe("elsewhere");
    expect(signInStep("https://id.test/login.html", broken)).toBe("elsewhere");
  });

  test("treats a missing or unparseable URL as elsewhere", () => {
    expect(signInStep(undefined, ENDPOINTS)).toBe("elsewhere");
    expect(signInStep("not a url", ENDPOINTS)).toBe("elsewhere");
  });
});
