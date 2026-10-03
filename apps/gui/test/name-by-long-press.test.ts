import { beforeEach, describe, expect, test } from "bun:test";

import { native } from "./capacitor-fakes";

const { androidToast } = await import("../src/platform/android-toast");
const { nameByLongPress } = await import("../src/my-page/name-by-long-press");

describe("nameByLongPress", () => {
  beforeEach(() => native.reset());

  test("names an item with the shell's Toast once it is held, and not before", () => {
    const shown: string[] = [];
    const held = nameByLongPress("Rainbow Kiwami", { show: (text) => shown.push(text) });

    expect(shown).toEqual([]);
    held?.();

    expect(shown).toEqual(["Rainbow Kiwami"]);
  });

  test("leaves the naming to a tooltip where the shell has no Toast", () => {
    expect(nameByLongPress("Clear", undefined)).toBeNull();
  });

  test("on Android, asks Capacitor's Toast plugin for the name alone, for the short time", () => {
    nameByLongPress("Full Combo", androidToast)?.();

    expect(native.toasts).toEqual([{ text: "Full Combo", duration: "short" }]);
  });

  test("names each item by its own words, once for each hold", () => {
    const names = ["White Iki", "Donderful Combo", "White Iki"];
    for (const name of names) {
      nameByLongPress(name, androidToast)?.();
    }

    expect(native.toasts.map(({ text }) => text)).toEqual(names);
  });
});
