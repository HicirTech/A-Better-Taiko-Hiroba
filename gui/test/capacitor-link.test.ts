import { beforeEach, describe, expect, test } from "bun:test";

import { native } from "./capacitor-fakes";

const { capacitorLink } = await import("../src/platform/capacitor-link");

describe("capacitorLink", () => {
  beforeEach(() => native.reset());

  test("sends a page to the default browser, outside the app", () => {
    capacitorLink.open("https://github.com/HicirTech/A-Better-Taiko-Hiroba/releases/tag/v0.2.0");
    expect(native.externalUrls).toEqual([
      "https://github.com/HicirTech/A-Better-Taiko-Hiroba/releases/tag/v0.2.0",
    ]);
    expect(native.openedWith).toEqual([]);
  });
});
