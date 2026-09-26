import { describe, expect, test } from "bun:test";

import { endpointsFromOverrides, HIROBA_ENDPOINTS } from "../src/hiroba-session";

describe("endpointsFromOverrides", () => {
  test("uses the real sites when neither override is set", () => {
    expect(endpointsFromOverrides(undefined, undefined)).toBe(HIROBA_ENDPOINTS);
    expect(endpointsFromOverrides("", "")).toBe(HIROBA_ENDPOINTS);
  });

  test("uses both overrides together", () => {
    expect(endpointsFromOverrides("http://hiroba.test:8807", "id.test:8808")).toEqual({
      hirobaOrigin: "http://hiroba.test:8807",
      idpHost: "id.test:8808",
    });
  });

  test("refuses one override alone rather than reaching the real other site", () => {
    expect(() => endpointsFromOverrides("http://hiroba.test:8807", undefined)).toThrow();
    expect(() => endpointsFromOverrides(undefined, "id.test:8808")).toThrow();
  });
});
