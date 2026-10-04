import { describe, expect, test } from "bun:test";

import { endpointsFromOverrides, HIROBA_ENDPOINTS, idpOrigin } from "../src/hiroba-session";

describe("endpointsFromOverrides", () => {
  test("uses the real sites when neither override is set", () => {
    expect(endpointsFromOverrides(undefined, undefined)).toBe(HIROBA_ENDPOINTS);
    expect(endpointsFromOverrides("", "", "")).toBe(HIROBA_ENDPOINTS);
    expect(HIROBA_ENDPOINTS.imgOrigin).toBe("https://img.taiko-p.jp");
  });

  test("uses both overrides together, with no picture host unless its own is set", () => {
    expect(endpointsFromOverrides("http://hiroba.test:8807", "id.test:8808")).toEqual({
      hirobaOrigin: "http://hiroba.test:8807",
      idpHost: "id.test:8808",
      idpDomain: "id.test",
      imgOrigin: null,
    });
  });

  test("takes the picture host's override beside the other two", () => {
    expect(
      endpointsFromOverrides("http://hiroba.test:8807", "id.test:8808", "http://img.test:8807"),
    ).toEqual({
      hirobaOrigin: "http://hiroba.test:8807",
      idpHost: "id.test:8808",
      idpDomain: "id.test",
      imgOrigin: "http://img.test:8807",
    });
  });

  test("refuses one override alone rather than reaching the real other site", () => {
    expect(() => endpointsFromOverrides("http://hiroba.test:8807", undefined)).toThrow();
    expect(() => endpointsFromOverrides(undefined, "id.test:8808")).toThrow();
  });

  test("refuses the picture host's override without the other two", () => {
    expect(() => endpointsFromOverrides(undefined, undefined, "http://img.test:8807")).toThrow();
    expect(() =>
      endpointsFromOverrides("http://hiroba.test:8807", undefined, "http://img.test:8807"),
    ).toThrow();
  });
});

describe("idpOrigin", () => {
  test("serves the ID host on Hiroba's scheme", () => {
    expect(idpOrigin(HIROBA_ENDPOINTS)).toBe("https://account.bandainamcoid.com");
    const mock = {
      hirobaOrigin: "http://hiroba.test:8807",
      idpHost: "id.test:8808",
      idpDomain: "id.test",
      imgOrigin: null,
    };
    expect(idpOrigin(mock)).toBe("http://id.test:8808");
  });
});
