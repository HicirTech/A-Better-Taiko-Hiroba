import { beforeEach, describe, expect, test } from "bun:test";

import { native } from "./capacitor-fakes";

const { androidLink } = await import("../src/platform/android-link");

describe("androidLink", () => {
  beforeEach(() => native.reset());

  test("sends a page to the default browser, outside the app", () => {
    androidLink.open("https://github.com/HicirTech/A-Better-Taiko-Hiroba/releases/tag/v0.2.0");
    expect(native.externalUrls).toEqual([
      "https://github.com/HicirTech/A-Better-Taiko-Hiroba/releases/tag/v0.2.0",
    ]);
    expect(native.openedWith).toEqual([]);
  });
});
