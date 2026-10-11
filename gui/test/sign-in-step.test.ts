import { describe, expect, test } from "bun:test";

import { HIROBA_ENDPOINTS, signInHost, signInStep } from "../src/hiroba-session";

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
    ["https://accounts.service.test/signin?client_id=x", "service"],
    ["http://elsewhere.test/index.php", "elsewhere"],
  ] as const)("%s is %s", (url, step) => {
    expect(signInStep(url, ENDPOINTS)).toBe(step);
  });

  test("never reads a host out of the query string", () => {
    const url = "https://id.test/login.html?redirect_uri=https%3A%2F%2Fhiroba.test%2Findex.php";
    expect(signInStep(url, ENDPOINTS)).toBe("idp");
    expect(signInStep("https://other.test/?https://hiroba.test/index.php", ENDPOINTS)).toBe(
      "service",
    );
  });

  test("compares origins: either host on another port is a service, and off https elsewhere", () => {
    expect(signInStep("http://hiroba.test/index.php", ENDPOINTS)).toBe("elsewhere");
    expect(signInStep("http://hiroba.test/login.php", ENDPOINTS)).toBe("elsewhere");
    expect(signInStep("ws://hiroba.test/index.php", ENDPOINTS)).toBe("elsewhere");
    expect(signInStep("https://hiroba.test:8443/index.php", ENDPOINTS)).toBe("service");
    expect(signInStep("http://id.test/login.html", ENDPOINTS)).toBe("elsewhere");
    expect(signInStep("https://id.test:8443/login.html", ENDPOINTS)).toBe("service");
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
    expect(signInStep("https://hiroba.test:8807/index.php", mock)).toBe("service");
    expect(signInStep("http://id.test/login.html", mock)).toBe("elsewhere");
    expect(signInStep("http://offsite.test:8808/login.html", mock)).toBe("elsewhere");
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
    expect(signInStep("https://evilbandainamcoid.com/", HIROBA_ENDPOINTS)).toBe("service");
    expect(signInStep("https://bandainamcoid.com.evil.test/", HIROBA_ENDPOINTS)).toBe("service");
    expect(signInStep("http://www.bandainamcoid.com/v2/oauth2/auth", HIROBA_ENDPOINTS)).toBe(
      "elsewhere",
    );
    expect(signInStep("https://www.bandainamcoid.com:8443/", HIROBA_ENDPOINTS)).toBe("service");
    expect(signInStep("https://auth.id.test/v2/oauth2/auth", ENDPOINTS)).toBe("idp");
  });

  test("names a service known to refuse an embedded browser: exact host, Hiroba's scheme", () => {
    const google = "https://accounts.google.com/o/oauth2/v2/auth?client_id=x&state=y";
    expect(signInStep(google, HIROBA_ENDPOINTS)).toBe("refuser");
    expect(signInStep("https://accounts.google.com.attacker.test/", HIROBA_ENDPOINTS)).toBe(
      "service",
    );
    expect(signInStep("https://www.google.com/", HIROBA_ENDPOINTS)).toBe("service");
    expect(signInStep("https://accounts.google.com:8443/", HIROBA_ENDPOINTS)).toBe("service");
    expect(signInStep("http://accounts.google.com/", HIROBA_ENDPOINTS)).toBe("elsewhere");
    // Endpoints that name no refuser know none.
    expect(signInStep("https://accounts.google.com/", ENDPOINTS)).toBe("service");
  });

  test("names a stand-in's refuser on its own scheme and port", () => {
    const mock = {
      hirobaOrigin: "http://hiroba.test:8807",
      idpHost: "id.test:8808",
      idpDomain: "id.test",
      imgOrigin: null,
      refusingHosts: ["refuses.test:8808"],
    };
    expect(signInStep("http://refuses.test:8808/signin.html", mock)).toBe("refuser");
    expect(signInStep("http://REFUSES.test:8808/", mock)).toBe("refuser");
    expect(signInStep("https://refuses.test:8808/signin.html", mock)).toBe("service");
    expect(signInStep("http://refuses.test/signin.html", mock)).toBe("elsewhere");
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

describe("signInHost", () => {
  test("keeps the host and port only, never the path or query", () => {
    expect(signInHost("https://accounts.google.com/o/oauth2/auth?state=secret")).toBe(
      "accounts.google.com",
    );
    expect(signInHost("http://refuses.test:8808/signin.html")).toBe("refuses.test:8808");
  });

  test("gives a question mark for a URL it cannot read", () => {
    expect(signInHost("not a url")).toBe("?");
    expect(signInHost(undefined)).toBe("?");
  });
});
