import { describe, expect, test } from "bun:test";

import { createTranslator, LOCALES } from "../src/index";
import { en } from "../src/messages/en";

describe("createTranslator", () => {
  test("fills a parameter the message names", () => {
    const { t } = createTranslator("en");
    expect(t("profile.fetchedAt", { time: "12:00" })).toStartWith("Read at 12:00.");
  });

  test("fills every parameter of a whole sentence", () => {
    const { t } = createTranslator("en");
    expect(t("profile.crowns", { silver: 11, gold: 2, donderful: 1 })).toBe(
      "Crowns (Oni and Ura Oni): Silver 11 · Gold 2 · Donderful 1",
    );
  });

  test("leaves a placeholder without a parameter as written", () => {
    const { t } = createTranslator("en");
    expect(t("profile.fetchedAt")).toContain("{time}");
  });

  test("defaults to English", () => {
    expect(createTranslator().locale).toBe("en");
  });
});

describe("the English catalog", () => {
  test("words every key with non-empty text", () => {
    for (const [key, text] of Object.entries(en)) {
      expect({ key, empty: text.trim() === "" }).toEqual({ key, empty: false });
    }
  });

  test("is the only locale so far", () => {
    expect([...LOCALES]).toEqual(["en"]);
  });
});
