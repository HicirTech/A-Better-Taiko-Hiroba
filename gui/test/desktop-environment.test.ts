import { describe, expect, test } from "bun:test";

import { desktopEnvironment } from "../electron/desktop-environment";
import { endpointsFromOverrides, HIROBA_ENDPOINTS } from "../src/hiroba-session";
import { UPDATE_FEED_URL } from "../src/updates";

const DEVELOPMENT = {
  ABTH_DEV_SERVER_URL: "http://localhost:5173",
  ABTH_DEV_HIROBA_ORIGIN: "http://hiroba.test:8807",
  ABTH_DEV_IDP_HOST: "id.test:8808",
  ABTH_DEV_IMG_ORIGIN: "http://img.test:8807",
  ABTH_DEV_USER_DATA: "C:/dev-data",
  ABTH_DEV_NOW: "2026-09-27T03:00:00Z",
  ABTH_DEV_UPDATE_FEED: "http://feed.test:8809/update.json",
};

describe("desktopEnvironment", () => {
  test("a packaged build takes none of the development variables", () => {
    const environment = desktopEnvironment(true, DEVELOPMENT);
    expect(environment.endpoints).toBe(HIROBA_ENDPOINTS);
    expect(environment.updateFeedUrl).toBe(UPDATE_FEED_URL);
    expect(environment.devServerUrl).toBeUndefined();
    expect(environment.userData).toBeUndefined();
    expect(Math.abs(environment.now().getTime() - Date.now())).toBeLessThan(5_000);
  });

  test("a packaged build does not stop at one endpoint override alone: it ignores both", () => {
    const half = { ABTH_DEV_HIROBA_ORIGIN: "http://hiroba.test:8807" };
    expect(desktopEnvironment(true, half).endpoints).toBe(HIROBA_ENDPOINTS);
    expect(() => desktopEnvironment(false, half)).toThrow();
  });

  test("a development run takes each variable it is given", () => {
    const environment = desktopEnvironment(false, DEVELOPMENT);
    expect(environment.endpoints).toEqual(
      endpointsFromOverrides("http://hiroba.test:8807", "id.test:8808", "http://img.test:8807"),
    );
    expect(environment.endpoints).not.toBe(HIROBA_ENDPOINTS);
    expect(environment.devServerUrl).toBe("http://localhost:5173");
    expect(environment.userData).toBe("C:/dev-data");
    expect(environment.now().toISOString()).toBe("2026-09-27T03:00:00.000Z");
    expect(environment.updateFeedUrl).toBe("http://feed.test:8809/update.json");
  });

  test("a development run checks for no update unless it names a feed", () => {
    expect(desktopEnvironment(false, {}).updateFeedUrl).toBeUndefined();
    expect(desktopEnvironment(false, { ABTH_DEV_UPDATE_FEED: "" }).updateFeedUrl).toBeUndefined();
  });

  test("a development run with none of them is as a packaged build is", () => {
    const environment = desktopEnvironment(false, {});
    expect(environment.endpoints).toBe(HIROBA_ENDPOINTS);
    expect(environment.devServerUrl).toBeUndefined();
    expect(environment.userData).toBeUndefined();
    expect(Math.abs(environment.now().getTime() - Date.now())).toBeLessThan(5_000);
  });

  test("a fixed time that is no time, and a data folder that is empty, are not taken", () => {
    const environment = desktopEnvironment(false, { ABTH_DEV_NOW: "soon", ABTH_DEV_USER_DATA: "" });
    expect(environment.userData).toBeUndefined();
    expect(Math.abs(environment.now().getTime() - Date.now())).toBeLessThan(5_000);
  });
});
